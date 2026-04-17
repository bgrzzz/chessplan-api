import os
import stripe
from datetime import datetime, date
from google import genai
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

# ═══════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════
load_dotenv()

# Supabase
sb_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
sb_anon = os.environ.get("SUPABASE_ANON_KEY", "")
sb_service = os.environ.get("SUPABASE_SERVICE_KEY", "")

supabase: Client = None
supabase_admin: Client = None

if sb_url and sb_anon:
    supabase = create_client(sb_url, sb_anon)
if sb_url and sb_service:
    supabase_admin = create_client(sb_url, sb_service)

# Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_PRICE_BRL = os.getenv("STRIPE_PRICE_BRL")
STRIPE_PRICE_USD = os.getenv("STRIPE_PRICE_USD")

# Gemini
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# App
app = FastAPI(title="ChessPlan API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://chess-plan.vercel.app")
FREE_AI_LIMIT = 3

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════
class ChessAnalysisRequest(BaseModel):
    pgn: str
    evaluation: float = 0.0
    player_rating: int = 1200

class CheckoutRequest(BaseModel):
    currency: str = "usd"

class CourseCheckoutRequest(BaseModel):
    currency: str = "usd"

class ModuleCompleteRequest(BaseModel):
    quiz_score: int = 0


async def get_user(authorization: Optional[str] = None):
    if not authorization or not authorization.startswith("Bearer ") or not supabase:
        return None
    try:
        user = supabase.auth.get_user(authorization.split(" ")[1])
        return {"id": user.user.id, "email": user.user.email}
    except:
        return None


def get_plan(user_id: str) -> dict:
    if not supabase_admin:
        return {"plan": "free", "status": "active"}
    try:
        res = supabase_admin.table("subscriptions").select("*").eq("user_id", user_id).execute()
        if res.data:
            return res.data[0]
    except:
        pass
    return {"plan": "free", "status": "active"}


def get_usage(user_id: str) -> int:
    if not supabase_admin:
        return 0
    today = date.today().isoformat()
    try:
        res = supabase_admin.table("daily_usage").select("ai_analyses_count").eq("user_id", user_id).eq("usage_date", today).execute()
        if res.data:
            return res.data[0]["ai_analyses_count"]
    except:
        pass
    return 0


def bump_usage(user_id: str):
    if not supabase_admin:
        return
    today = date.today().isoformat()
    try:
        existing = supabase_admin.table("daily_usage").select("id, ai_analyses_count").eq("user_id", user_id).eq("usage_date", today).execute()
        if existing.data:
            supabase_admin.table("daily_usage").update({
                "ai_analyses_count": existing.data[0]["ai_analyses_count"] + 1,
                "updated_at": "now()",
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase_admin.table("daily_usage").insert({
                "user_id": user_id,
                "usage_date": today,
                "ai_analyses_count": 1,
            }).execute()
    except Exception as e:
        print(f"Usage bump error: {e}")


# ═══════════════════════════════════════════════════════════════════
# ANALYZE (with gating)
# ═══════════════════════════════════════════════════════════════════
SYSTEM_PROMPT = """
Você é um Treinador de Xadrez nível Grande Mestre, paciente e didático.
Explique o PORQUÊ de um lance ser bom ou ruim usando conceitos como
'par de bispos', 'casa forte', 'coluna aberta', 'desenvolvimento'.
Adapte a linguagem para o rating do jogador. Responda em português brasileiro.
"""

@app.post("/analyze")
async def analyze(data: ChessAnalysisRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)

    # Gating
    if user:
        sub = get_plan(user["id"])
        is_pro = sub.get("plan") == "pro" and sub.get("status") == "active"
        if not is_pro:
            used = get_usage(user["id"])
            if used >= FREE_AI_LIMIT:
                return JSONResponse(status_code=403, content={
                    "error": "limit_reached",
                    "message": f"Você usou suas {FREE_AI_LIMIT} análises gratuitas de hoje.",
                    "upgrade_hint": "Assine o Pro para análises ilimitadas!",
                })

    prompt = (
        f"A partida está assim: {data.pgn}. "
        f"A avaliação da engine é {data.evaluation}. "
        f"O jogador tem {data.player_rating} de rating. "
        "Explique o erro ou o acerto principal em no máximo 3 frases."
    )

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-lite",
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.7,
            ),
            contents=prompt,
        )

        # Incrementa uso se free
        if user:
            sub = get_plan(user["id"])
            if not (sub.get("plan") == "pro" and sub.get("status") == "active"):
                bump_usage(user["id"])

        return {"feedback": response.text}
    except Exception as e:
        return {"error": str(e)}


# ═══════════════════════════════════════════════════════════════════
# USER PLAN
# ═══════════════════════════════════════════════════════════════════
@app.get("/user/plan")
async def user_plan(authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        return {"plan": "free", "status": "active", "ai_remaining": FREE_AI_LIMIT}

    sub = get_plan(user["id"])
    is_pro = sub.get("plan") == "pro" and sub.get("status") == "active"

    if is_pro:
        return {"plan": "pro", "status": "active", "ai_remaining": -1}

    used = get_usage(user["id"])
    return {
        "plan": "free",
        "status": "active",
        "ai_remaining": max(0, FREE_AI_LIMIT - used),
        "ai_used_today": used,
    }


# ═══════════════════════════════════════════════════════════════════
# STRIPE CHECKOUT
# ═══════════════════════════════════════════════════════════════════
@app.post("/stripe/create-checkout")
async def create_checkout(req: CheckoutRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Faça login para assinar")

    price_id = STRIPE_PRICE_BRL if req.currency == "brl" else STRIPE_PRICE_USD
    if not price_id:
        raise HTTPException(status_code=500, detail="Price não configurado")

    sub = get_plan(user["id"])
    customer_id = sub.get("stripe_customer_id")

    params = {
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{FRONTEND_URL}?checkout=success",
        "cancel_url": f"{FRONTEND_URL}?checkout=cancel",
        "metadata": {"user_id": user["id"], "email": user["email"]},
        "subscription_data": {"metadata": {"user_id": user["id"]}},
    }
    if customer_id:
        params["customer"] = customer_id
    else:
        params["customer_email"] = user["email"]

    try:
        session = stripe.checkout.Session.create(**params)
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/stripe/create-portal")
async def create_portal(authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessário")

    sub = get_plan(user["id"])
    cid = sub.get("stripe_customer_id")
    if not cid:
        raise HTTPException(status_code=400, detail="Sem assinatura")

    session = stripe.billing_portal.Session.create(customer=cid, return_url=FRONTEND_URL)
    return {"url": session.url}


# ═══════════════════════════════════════════════════════════════════
# STRIPE WEBHOOK
# ═══════════════════════════════════════════════════════════════════
@app.post("/stripe/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook inválido")

    data = event["data"]["object"]
    etype = event["type"]

    if not supabase_admin:
        return {"received": True}

    if etype == "checkout.session.completed":
        uid = data.get("metadata", {}).get("user_id")
        purchase_type = data.get("metadata", {}).get("type")

        # ── Compra de curso (one-time) ──
        if purchase_type == "course_purchase":
            course_id = data.get("metadata", {}).get("course_id")
            payment_id = data.get("payment_intent") or data.get("id")
            if uid and course_id:
                supabase_admin.table("user_course_access").upsert({
                    "user_id": uid,
                    "course_id": course_id,
                    "stripe_payment_id": payment_id,
                    "purchased_at": datetime.utcnow().isoformat(),
                }, on_conflict="user_id,course_id").execute()
                print(f"[Stripe] User {uid} comprou curso {course_id}")

        # ── Assinatura Pro (subscription) ──
        else:
            sub_id = data.get("subscription")
            cust_id = data.get("customer")
            if uid and sub_id:
                s = stripe.Subscription.retrieve(sub_id)
                supabase_admin.table("subscriptions").upsert({
                    "user_id": uid,
                    "stripe_customer_id": cust_id,
                    "stripe_subscription_id": sub_id,
                    "plan": "pro",
                    "status": "active",
                    "current_period_start": datetime.fromtimestamp(s.current_period_start).isoformat(),
                    "current_period_end": datetime.fromtimestamp(s.current_period_end).isoformat(),
                    "currency": s.currency,
                    "updated_at": datetime.utcnow().isoformat(),
                }, on_conflict="user_id").execute()

    elif etype == "customer.subscription.updated":
        sub_id = data.get("id")
        status = data.get("status")
        plan = "pro" if status in ("active", "trialing") else "free"
        supabase_admin.table("subscriptions").update({
            "plan": plan,
            "status": status if status != "trialing" else "active",
            "current_period_start": datetime.fromtimestamp(data["current_period_start"]).isoformat(),
            "current_period_end": datetime.fromtimestamp(data["current_period_end"]).isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("stripe_subscription_id", sub_id).execute()

    elif etype == "customer.subscription.deleted":
        sub_id = data.get("id")
        supabase_admin.table("subscriptions").update({
            "plan": "free", "status": "canceled",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("stripe_subscription_id", sub_id).execute()

    elif etype == "invoice.payment_failed":
        sub_id = data.get("subscription")
        if sub_id:
            supabase_admin.table("subscriptions").update({
                "status": "past_due",
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("stripe_subscription_id", sub_id).execute()

    return {"received": True}


# ═══════════════════════════════════════════════════════════════════
# COURSES — CATÁLOGO
# ═══════════════════════════════════════════════════════════════════
@app.get("/courses")
async def list_courses(authorization: Optional[str] = Header(None)):
    """Lista todos os cursos publicados com progresso do user se logado."""
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    # Busca cursos publicados
    res = supabase_admin.table("courses").select(
        "id, slug, title, description, difficulty, rating_range, "
        "price_brl, price_usd, thumbnail_url, total_modules, "
        "estimated_hours, free_preview_modules"
    ).eq("is_published", True).order("created_at").execute()

    courses = res.data or []

    # Se logado, adiciona progresso e acesso
    user = await get_user(authorization)
    if user:
        # Cursos comprados
        access_res = supabase_admin.table("user_course_access").select(
            "course_id"
        ).eq("user_id", user["id"]).execute()
        purchased_ids = {a["course_id"] for a in (access_res.data or [])}

        # Progresso por curso
        progress_res = supabase_admin.table("user_course_progress").select(
            "course_id"
        ).eq("user_id", user["id"]).execute()
        progress_counts = {}
        for p in (progress_res.data or []):
            cid = p["course_id"]
            progress_counts[cid] = progress_counts.get(cid, 0) + 1

        # Checa se é Pro (desconto)
        plan = get_plan(user["id"])
        is_pro = plan.get("plan") == "pro" and plan.get("status") == "active"

        for c in courses:
            c["purchased"] = c["id"] in purchased_ids
            c["completed_modules"] = progress_counts.get(c["id"], 0)
            c["is_pro"] = is_pro
    else:
        for c in courses:
            c["purchased"] = False
            c["completed_modules"] = 0
            c["is_pro"] = False

    return {"courses": courses}


@app.get("/courses/{course_id}")
async def get_course(course_id: str, authorization: Optional[str] = Header(None)):
    """Detalhes de um curso com lista de módulos e puzzles."""
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    # Busca o curso
    course_res = supabase_admin.table("courses").select("*").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    course = course_res.data[0]

    # Busca módulos ordenados
    modules_res = supabase_admin.table("course_modules").select(
        "id, order_index, title, description, pgn_data, key_concepts, "
        "estimated_minutes, is_free"
    ).eq("course_id", course_id).order("order_index").execute()
    modules = modules_res.data or []

    # Busca puzzles de todos os módulos
    module_ids = [m["id"] for m in modules]
    puzzles_by_module = {}
    if module_ids:
        puzzles_res = supabase_admin.table("course_puzzles").select(
            "id, module_id, order_index, fen, correct_move, explanation, hint, difficulty"
        ).in_("module_id", module_ids).order("order_index").execute()
        for p in (puzzles_res.data or []):
            mid = p["module_id"]
            if mid not in puzzles_by_module:
                puzzles_by_module[mid] = []
            puzzles_by_module[mid].append(p)

    # Verifica acesso do user
    user = await get_user(authorization)
    has_access = False
    completed_modules = set()

    if user:
        # Checa se comprou
        access_res = supabase_admin.table("user_course_access").select("id").eq(
            "user_id", user["id"]
        ).eq("course_id", course_id).execute()
        has_access = bool(access_res.data)

        # Progresso
        progress_res = supabase_admin.table("user_course_progress").select(
            "module_id, quiz_score, completed_at"
        ).eq("user_id", user["id"]).eq("course_id", course_id).execute()
        completed_modules = {p["module_id"] for p in (progress_res.data or [])}

    # Monta resposta com gating
    for m in modules:
        m["puzzles"] = puzzles_by_module.get(m["id"], [])
        m["completed"] = m["id"] in completed_modules

        # Gating: se não comprou e não é módulo grátis, esconde o PGN
        if not has_access and not m["is_free"]:
            m["pgn_data"] = None
            m["puzzles"] = []
            m["locked"] = True
        else:
            m["locked"] = False

    return {
        "course": course,
        "modules": modules,
        "has_access": has_access,
        "completed_count": len(completed_modules),
    }


# ═══════════════════════════════════════════════════════════════════
# COURSES — COMPRA (one-time payment)
# ═══════════════════════════════════════════════════════════════════
@app.post("/courses/{course_id}/purchase")
async def purchase_course(course_id: str, req: CourseCheckoutRequest, authorization: Optional[str] = Header(None)):
    """Cria sessão de checkout Stripe para comprar um curso avulso."""
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Faça login para comprar")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    # Busca o curso
    course_res = supabase_admin.table("courses").select("*").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    course = course_res.data[0]

    # Verifica se já comprou
    existing = supabase_admin.table("user_course_access").select("id").eq(
        "user_id", user["id"]
    ).eq("course_id", course_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Você já possui este curso")

    # Seleciona o price do Stripe baseado na moeda
    price_id = course.get("stripe_price_brl") if req.currency == "brl" else course.get("stripe_price_usd")

    # Se não tem Stripe Price configurado, cria um checkout com preço dinâmico
    if not price_id:
        amount = course.get("price_brl") if req.currency == "brl" else course.get("price_usd")
        currency = "brl" if req.currency == "brl" else "usd"

        # Desconto de 30% para Pro
        plan = get_plan(user["id"])
        is_pro = plan.get("plan") == "pro" and plan.get("status") == "active"
        if is_pro:
            amount = round(float(amount) * 0.7, 2)

        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": currency,
                        "unit_amount": int(float(amount) * 100),
                        "product_data": {
                            "name": course["title"],
                            "description": course.get("description", ""),
                        },
                    },
                    "quantity": 1,
                }],
                success_url=f"{FRONTEND_URL}?course_purchased={course_id}",
                cancel_url=f"{FRONTEND_URL}?course_cancel={course_id}",
                metadata={
                    "user_id": user["id"],
                    "course_id": course_id,
                    "type": "course_purchase",
                },
                customer_email=user["email"],
            )
            return {"url": session.url}
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        # Usa Price ID pré-configurado
        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=f"{FRONTEND_URL}?course_purchased={course_id}",
                cancel_url=f"{FRONTEND_URL}?course_cancel={course_id}",
                metadata={
                    "user_id": user["id"],
                    "course_id": course_id,
                    "type": "course_purchase",
                },
                customer_email=user["email"],
            )
            return {"url": session.url}
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════════
# COURSES — PROGRESSO
# ═══════════════════════════════════════════════════════════════════
@app.get("/courses/{course_id}/progress")
async def get_progress(course_id: str, authorization: Optional[str] = Header(None)):
    """Retorna o progresso detalhado do user num curso."""
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessário")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    # Módulos do curso
    modules_res = supabase_admin.table("course_modules").select(
        "id, order_index, title"
    ).eq("course_id", course_id).order("order_index").execute()
    modules = modules_res.data or []

    # Progresso
    progress_res = supabase_admin.table("user_course_progress").select(
        "module_id, quiz_score, completed_at"
    ).eq("user_id", user["id"]).eq("course_id", course_id).execute()
    progress_map = {p["module_id"]: p for p in (progress_res.data or [])}

    total = len(modules)
    completed = 0
    module_progress = []

    for m in modules:
        prog = progress_map.get(m["id"])
        is_done = prog is not None
        if is_done:
            completed += 1
        module_progress.append({
            "module_id": m["id"],
            "order_index": m["order_index"],
            "title": m["title"],
            "completed": is_done,
            "quiz_score": prog["quiz_score"] if prog else None,
            "completed_at": prog["completed_at"] if prog else None,
        })

    return {
        "course_id": course_id,
        "total_modules": total,
        "completed_modules": completed,
        "percentage": round((completed / total) * 100) if total > 0 else 0,
        "modules": module_progress,
    }


@app.post("/courses/{course_id}/modules/{module_id}/complete")
async def complete_module(
    course_id: str, module_id: str,
    req: ModuleCompleteRequest,
    authorization: Optional[str] = Header(None)
):
    """Marca um módulo como concluído com score do quiz."""
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessário")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    # Verifica se o módulo pertence ao curso
    mod_res = supabase_admin.table("course_modules").select("id, is_free").eq(
        "id", module_id
    ).eq("course_id", course_id).execute()
    if not mod_res.data:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")

    module = mod_res.data[0]

    # Verifica acesso (comprou ou é módulo grátis)
    if not module["is_free"]:
        access_res = supabase_admin.table("user_course_access").select("id").eq(
            "user_id", user["id"]
        ).eq("course_id", course_id).execute()
        if not access_res.data:
            raise HTTPException(status_code=403, detail="Compre o curso para acessar este módulo")

    # Upsert progresso
    supabase_admin.table("user_course_progress").upsert({
        "user_id": user["id"],
        "module_id": module_id,
        "course_id": course_id,
        "quiz_score": req.quiz_score,
        "completed_at": datetime.utcnow().isoformat(),
    }, on_conflict="user_id,module_id").execute()

    return {"completed": True, "module_id": module_id, "quiz_score": req.quiz_score}


# ═══════════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════════
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "stripe": bool(stripe.api_key),
        "gemini": bool(os.getenv("GEMINI_API_KEY")),
        "supabase": bool(supabase_admin),
    }
