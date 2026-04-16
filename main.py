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
