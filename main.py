import os
import stripe
import json
import re
import secrets
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen
from urllib.error import HTTPError, URLError
from datetime import datetime, date
from datetime import timedelta
from google import genai
from fastapi import FastAPI, HTTPException, Request, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

# ═══════════════════════════════════════════════════════════════════
# 1. CONFIGURAÇÃO INICIAL
# ═══════════════════════════════════════════════════════════════════
load_dotenv()
app = FastAPI(title="ChessPlan API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://chessplan.com.br")
FREE_AI_LIMIT = 3

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://www.chessplan.com.br",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase
sb_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
sb_anon = os.environ.get("SUPABASE_ANON_KEY", "")
sb_service = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
supabase: Client = create_client(sb_url, sb_anon) if sb_url and sb_anon else None
supabase_admin: Client = create_client(sb_url, sb_service) if sb_url and sb_service else None

# Stripe & Gemini
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_PRICE_BRL = os.getenv("STRIPE_PRICE_BRL")
STRIPE_PRICE_USD = os.getenv("STRIPE_PRICE_USD")
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ═══════════════════════════════════════════════════════════════════
# 2. ROTA DO SITEMAP (Antes do Helpers para garantir prioridade)
# ═══════════════════════════════════════════════════════════════════
@app.get("/sitemap.xml")
async def get_sitemap():
    base_url = "https://www.chessplan.com.br"
    static_pages = ["/", "/pricing", "/blog", "/rivalry-tracker"]
    xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for page in static_pages:
        xml.append(f'  <url><loc>{base_url}{page}</loc></url>')
    if supabase_admin:
        try:
            res = supabase_admin.table("posts").select("slug").execute()
            for post in (res.data or []):
                if post.get("slug"):
                    xml.append(f'  <url><loc>{base_url}/blog/{post["slug"]}</loc></url>')
        except: pass
    xml.append('</urlset>')
    return Response(content="\n".join(xml), media_type="application/xml")

# ═══════════════════════════════════════════════════════════════════
# 3. HELPERS & MODELOS
# ═══════════════════════════════════════════════════════════════════
class ChessAnalysisRequest(BaseModel):
    pgn: str
    evaluation: float = 0.0
    player_rating: int = 1200

class OpeningExplorerRequest(BaseModel):
    fen: str
    source: str = "masters"

class CheckoutRequest(BaseModel):
    currency: str = "usd"

class CourseCheckoutRequest(BaseModel):
    currency: str = "usd"

class ModuleCompleteRequest(BaseModel):
    quiz_score: int = 0

class ReferralRegisterRequest(BaseModel):
    referrer_id: str

class ReferralClaimRequest(BaseModel):
    months: int = 1

class AcademyCreateRequest(BaseModel):
    name: str

class AcademyInviteRequest(BaseModel):
    email: str
    role: str = "student"

class AcademyJoinRequest(BaseModel):
    token: str

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

def parse_iso_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None

def extend_internal_pro(user_id: str, days: int):
    if not supabase_admin:
        return None

    now = datetime.utcnow()
    current = get_plan(user_id)
    current_end = parse_iso_datetime(current.get("current_period_end"))
    start = current_end if current_end and current_end > now else now
    new_end = start + timedelta(days=days)

    payload = {
        "user_id": user_id,
        "plan": "pro",
        "status": "active",
        "current_period_start": now.isoformat(),
        "current_period_end": new_end.isoformat(),
        "updated_at": now.isoformat(),
    }

    supabase_admin.table("subscriptions").upsert(payload, on_conflict="user_id").execute()
    return new_end.isoformat()

def grant_referee_bonus(referral):
    if not supabase_admin or referral.get("referee_bonus_granted") or not referral.get("referee_id"):
        return

    extend_internal_pro(referral["referee_id"], 7)
    supabase_admin.table("referrals").update({
        "referee_bonus_granted": True,
    }).eq("id", referral["id"]).execute()

def complete_referral_for_user(user_id: str):
    if not supabase_admin:
        return False

    try:
        res = supabase_admin.table("referrals").select("*").eq("referee_id", user_id).eq("status", "registered").limit(1).execute()
        if not res.data:
            return False

        referral = res.data[0]
        now = datetime.utcnow().isoformat()

        if not referral.get("reward_granted"):
            rewards = supabase_admin.table("referral_rewards").select("credit_months,total_earned").eq("user_id", referral["referrer_id"]).execute()
            current = rewards.data[0] if rewards.data else {"credit_months": 0, "total_earned": 0}
            supabase_admin.table("referral_rewards").upsert({
                "user_id": referral["referrer_id"],
                "credit_months": int(current.get("credit_months") or 0) + 1,
                "total_earned": int(current.get("total_earned") or 0) + 1,
                "updated_at": now,
            }, on_conflict="user_id").execute()

        supabase_admin.table("referrals").update({
            "status": "completed",
            "completed_at": now,
            "reward_granted": True,
        }).eq("id", referral["id"]).execute()
        return True
    except Exception as e:
        print(f"Referral complete error: {e}")
        return False

def is_academy_coach(user_id: str, academy_id: str) -> bool:
    if not supabase_admin:
        return False
    try:
        academy = supabase_admin.table("academies").select("owner_id").eq("id", academy_id).limit(1).execute()
        academy_data = academy.data[0] if academy.data else None
        if academy_data and academy_data.get("owner_id") == user_id:
            return True
        member = supabase_admin.table("academy_members").select("role").eq("academy_id", academy_id).eq("user_id", user_id).limit(1).execute()
        member_data = member.data[0] if member.data else None
        return member_data and member_data.get("role") == "coach"
    except Exception:
        return False

def can_coach_student(coach_id: str, student_id: str) -> bool:
    if not supabase_admin or coach_id == student_id:
        return False
    try:
        coach_members = supabase_admin.table("academy_members").select("academy_id").eq("user_id", coach_id).eq("role", "coach").execute()
        academy_ids = [row["academy_id"] for row in (coach_members.data or [])]
        if not academy_ids:
            return False
        student = supabase_admin.table("academy_members").select("academy_id").eq("user_id", student_id).in_("academy_id", academy_ids).limit(1).execute()
        return bool(student.data)
    except Exception:
        return False

def public_profile_map(user_ids):
    if not supabase_admin or not user_ids:
        return {}
    profiles = supabase_admin.table("profiles").select(
        "id, username, display_name, avatar_url, lichess_username, chesscom_username"
    ).in_("id", list(set(user_ids))).execute()
    return {p["id"]: p for p in (profiles.data or [])}

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

def parse_cdb_number(value, default=0, as_float=False):
    cleaned = re.sub(r"[^0-9.\-]", "", str(value or ""))
    if cleaned in ("", "-", ".", "-."):
        return default
    try:
        return float(cleaned) if as_float else int(float(cleaned))
    except ValueError:
        return default

def parse_cdb_moves(raw: str):
    raw = (raw or "").replace("\x00", "").strip()
    if not raw or raw.startswith("unknown") or raw.startswith("nobestmove"):
        return []

    moves = []
    for part in raw.split("|"):
        part = part.strip()
        if not part:
            continue

        move_data = {}
        for item in part.split(","):
            item = item.strip()
            if ":" in item:
                k, v = item.split(":", 1)
                move_data[k.strip()] = v.strip()

        if not move_data.get("move"):
            continue

        moves.append({
            "san": move_data["move"],
            "score": parse_cdb_number(move_data.get("score")),
            "rank": parse_cdb_number(move_data.get("rank")),
            "note": move_data.get("note", ""),
            "winrate": parse_cdb_number(move_data.get("winrate"), 0.0, as_float=True),
        })

    moves.sort(key=lambda x: (x["score"], x["rank"], x["winrate"]), reverse=True)
    return moves

# ═══════════════════════════════════════════════════════════════════
# CHESS CLOUD DATABASE (CDB) EXPLORER
# ═══════════════════════════════════════════════════════════════════
@app.post("/cdb-explorer")
async def cdb_explorer(data: OpeningExplorerRequest):
    """
    Consulta o Chess Cloud Database (chessdb.cn) para uma posição FEN.
    Retorna os lances mais jogados com estatísticas (score, winrate).
    """
    fen = data.fen.strip()
    if not fen:
        raise HTTPException(status_code=400, detail="FEN é obrigatório")

    params = {"action": "queryall", "board": fen}
    url = f"https://www.chessdb.cn/cdb.php?{urlencode(params)}"

    request = UrlRequest(
        url,
        headers={
            "Accept": "text/plain",
            "User-Agent": "ChessPlan/1.0 contact.chessplan@gmail.com",
        },
    )

    try:
        with urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8", errors="ignore")
            return {"moves": parse_cdb_moves(raw)[:8]}
    except HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=e.code, detail=f"CDB error: {body}")
    except URLError as e:
        raise HTTPException(status_code=502, detail=f"Falha ao conectar ao CDB: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════════
# ANALYZE (with gating)
# ═══════════════════════════════════════════════════════════════════
# REFERRALS
@app.get("/referral/stats")
async def referral_stats(authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB nao configurado")

    referrals_res = supabase_admin.table("referrals").select(
        "referee_email, status, completed_at, created_at"
    ).eq("referrer_id", user["id"]).order("created_at", desc=True).execute()
    rewards_res = supabase_admin.table("referral_rewards").select(
        "credit_months,total_earned"
    ).eq("user_id", user["id"]).execute()

    referrals = referrals_res.data or []
    rewards = rewards_res.data[0] if rewards_res.data else {}

    return {
        "referral_code": user["id"],
        "referral_link": f"{FRONTEND_URL}/?ref={user['id']}",
        "total_invited": len(referrals),
        "registered": len([r for r in referrals if r.get("status") in ("registered", "completed")]),
        "completed": len([r for r in referrals if r.get("status") == "completed"]),
        "credit_months": int(rewards.get("credit_months") or 0),
        "total_earned": int(rewards.get("total_earned") or 0),
        "referrals": referrals,
    }

@app.post("/referral/register")
async def referral_register(req: ReferralRegisterRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB nao configurado")

    referrer_id = req.referrer_id.strip()
    if not referrer_id:
        raise HTTPException(status_code=400, detail="Codigo de indicacao invalido")
    if referrer_id == user["id"]:
        raise HTTPException(status_code=400, detail="Voce nao pode usar seu proprio codigo")

    existing = supabase_admin.table("referrals").select("*").eq("referee_id", user["id"]).execute()
    if existing.data:
        grant_referee_bonus(existing.data[0])
        return {"registered": True, "already_registered": True}

    try:
        payload = {
            "referrer_id": referrer_id,
            "referee_email": user.get("email"),
            "referee_id": user["id"],
            "status": "registered",
        }
        inserted = supabase_admin.table("referrals").insert(payload).execute()
        if inserted.data:
            grant_referee_bonus(inserted.data[0])
        return {"registered": True, "referee_bonus": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Nao foi possivel registrar indicacao: {e}")

@app.post("/referral/complete")
async def referral_complete(authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    return {"completed": complete_referral_for_user(user["id"])}

@app.post("/referral/claim-credit")
async def referral_claim_credit(req: ReferralClaimRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB nao configurado")

    months = max(1, min(int(req.months or 1), 12))
    rewards_res = supabase_admin.table("referral_rewards").select("credit_months,total_earned").eq("user_id", user["id"]).execute()
    rewards = rewards_res.data[0] if rewards_res.data else {"credit_months": 0, "total_earned": 0}
    available = int(rewards.get("credit_months") or 0)
    if available < months:
        raise HTTPException(status_code=400, detail="Voce nao tem creditos suficientes")

    pro_until = extend_internal_pro(user["id"], 30 * months)
    supabase_admin.table("referral_rewards").upsert({
        "user_id": user["id"],
        "credit_months": available - months,
        "total_earned": int(rewards.get("total_earned") or 0),
        "updated_at": datetime.utcnow().isoformat(),
    }, on_conflict="user_id").execute()

    return {"claimed": True, "credit_months": available - months, "pro_until": pro_until}

# ACADEMY
@app.post("/academies")
async def create_academy(req: AcademyCreateRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB nao configurado")

    name = req.name.strip()
    if len(name) < 3:
        raise HTTPException(status_code=400, detail="Nome da academia precisa ter ao menos 3 caracteres")

    academy = supabase_admin.table("academies").insert({
        "name": name,
        "owner_id": user["id"],
    }).execute()
    academy_data = academy.data[0]
    supabase_admin.table("academy_members").upsert({
        "academy_id": academy_data["id"],
        "user_id": user["id"],
        "role": "coach",
    }, on_conflict="academy_id,user_id").execute()

    return {"academy": academy_data}

@app.get("/academies/my")
async def my_academies(authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB nao configurado")

    memberships = supabase_admin.table("academy_members").select("academy_id, role, joined_at").eq("user_id", user["id"]).execute()
    academy_ids = list({row["academy_id"] for row in (memberships.data or [])})

    owned = supabase_admin.table("academies").select("*").eq("owner_id", user["id"]).execute()
    for row in (owned.data or []):
        if row["id"] not in academy_ids:
            academy_ids.append(row["id"])

    if not academy_ids:
        return {"academies": []}

    academies_res = supabase_admin.table("academies").select("*").in_("id", academy_ids).order("created_at", desc=True).execute()
    members_res = supabase_admin.table("academy_members").select("academy_id,user_id,role,joined_at").in_("academy_id", academy_ids).execute()
    members = members_res.data or []
    profiles = public_profile_map([m["user_id"] for m in members])
    role_by_academy = {m["academy_id"]: m["role"] for m in (memberships.data or [])}

    academies = []
    for academy in (academies_res.data or []):
        academy_members = []
        for member in members:
            if member["academy_id"] != academy["id"]:
                continue
            profile = profiles.get(member["user_id"], {})
            academy_members.append({
                **member,
                "profile": profile,
            })
        academies.append({
            **academy,
            "my_role": "coach" if academy["owner_id"] == user["id"] else role_by_academy.get(academy["id"], "student"),
            "members": academy_members,
        })

    return {"academies": academies}

@app.post("/academies/{academy_id}/invite")
async def invite_to_academy(academy_id: str, req: AcademyInviteRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    if not is_academy_coach(user["id"], academy_id):
        raise HTTPException(status_code=403, detail="Apenas coaches podem convidar alunos")

    email = req.email.strip().lower()
    role = req.role if req.role in ("coach", "student") else "student"
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Email invalido")

    token = secrets.token_urlsafe(24)
    invite = supabase_admin.table("academy_invites").insert({
        "academy_id": academy_id,
        "email": email,
        "role": role,
        "token": token,
    }).execute()
    invite_data = invite.data[0]
    invite_link = f"{FRONTEND_URL}/join?token={token}"

    return {"invite": invite_data, "invite_link": invite_link}

@app.post("/academies/join")
async def join_academy(req: AcademyJoinRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB nao configurado")

    token = req.token.strip()
    invite = supabase_admin.table("academy_invites").select("*").eq("token", token).limit(1).execute()
    if not invite.data:
        raise HTTPException(status_code=404, detail="Convite nao encontrado")

    invite_data = invite.data[0]
    expires_at = parse_iso_datetime(invite_data.get("expires_at"))
    if invite_data.get("accepted_at"):
        raise HTTPException(status_code=400, detail="Convite ja foi usado")
    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Convite expirado")
    if invite_data.get("email") and user.get("email") and invite_data["email"].lower() != user["email"].lower():
        raise HTTPException(status_code=403, detail="Este convite foi enviado para outro email")

    supabase_admin.table("academy_members").upsert({
        "academy_id": invite_data["academy_id"],
        "user_id": user["id"],
        "role": invite_data.get("role") or "student",
    }, on_conflict="academy_id,user_id").execute()
    supabase_admin.table("academy_invites").update({
        "accepted_at": datetime.utcnow().isoformat(),
    }).eq("id", invite_data["id"]).execute()

    return {"joined": True, "academy_id": invite_data["academy_id"]}

@app.get("/academies/students/{student_id}/overview")
async def academy_student_overview(student_id: str, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessario")
    if not can_coach_student(user["id"], student_id):
        raise HTTPException(status_code=403, detail="Voce nao e coach deste aluno")

    games = supabase_admin.table("games").select(
        "id, platform, opponent, opening, result, played_at, pgn, player_color"
    ).eq("user_id", student_id).order("played_at", desc=True).limit(50).execute()
    progress = supabase_admin.table("user_course_progress").select(
        "course_id, module_id, quiz_score, completed_at"
    ).eq("user_id", student_id).order("completed_at", desc=True).limit(30).execute()

    return {
        "can_view": True,
        "games": games.data or [],
        "course_progress": progress.data or [],
    }

SYSTEM_PROMPT = """
Você é um Treinador de Xadrez nível Grande Mestre, paciente e didático.
Explique o PORQUÊ de um lance ser bom ou ruim usando conceitos como
'par de bispos', 'casa forte', 'coluna aberta', 'desenvolvimento'.
Adapte a linguagem para o rating do jogador. Responda em português brasileiro.
"""

@app.post("/analyze")
async def analyze(data: ChessAnalysisRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    used_before = None

    if user:
        sub = get_plan(user["id"])
        is_pro = sub.get("plan") == "pro" and sub.get("status") == "active"
        if not is_pro:
            used = get_usage(user["id"])
            used_before = used
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

        if user:
            sub = get_plan(user["id"])
            if not (sub.get("plan") == "pro" and sub.get("status") == "active"):
                bump_usage(user["id"])
            if used_before in (None, 0):
                complete_referral_for_user(user["id"])

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
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    res = supabase_admin.table("courses").select(
        "id, slug, title, description, difficulty, rating_range, "
        "price_brl, price_usd, thumbnail_url, total_modules, "
        "estimated_hours, free_preview_modules"
    ).eq("is_published", True).order("created_at").execute()

    courses = res.data or []
    user = await get_user(authorization)
    if user:
        access_res = supabase_admin.table("user_course_access").select("course_id").eq("user_id", user["id"]).execute()
        purchased_ids = {a["course_id"] for a in (access_res.data or [])}
        progress_res = supabase_admin.table("user_course_progress").select("course_id").eq("user_id", user["id"]).execute()
        progress_counts = {}
        for p in (progress_res.data or []):
            cid = p["course_id"]
            progress_counts[cid] = progress_counts.get(cid, 0) + 1
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
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    course_res = supabase_admin.table("courses").select("*").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    course = course_res.data[0]

    modules_res = supabase_admin.table("course_modules").select(
        "id, order_index, title, description, pgn_data, key_concepts, estimated_minutes, is_free"
    ).eq("course_id", course_id).order("order_index").execute()
    modules = modules_res.data or []

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

    user = await get_user(authorization)
    has_access = False
    completed_modules = set()
    if user:
        access_res = supabase_admin.table("user_course_access").select("id").eq("user_id", user["id"]).eq("course_id", course_id).execute()
        has_access = bool(access_res.data)
        progress_res = supabase_admin.table("user_course_progress").select("module_id").eq("user_id", user["id"]).eq("course_id", course_id).execute()
        completed_modules = {p["module_id"] for p in (progress_res.data or [])}

    for m in modules:
        m["puzzles"] = puzzles_by_module.get(m["id"], [])
        m["completed"] = m["id"] in completed_modules
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
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Faça login para comprar")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    course_res = supabase_admin.table("courses").select("*").eq("id", course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    course = course_res.data[0]

    existing = supabase_admin.table("user_course_access").select("id").eq("user_id", user["id"]).eq("course_id", course_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Você já possui este curso")

    price_id = course.get("stripe_price_brl") if req.currency == "brl" else course.get("stripe_price_usd")

    if not price_id:
        amount = course.get("price_brl") if req.currency == "brl" else course.get("price_usd")
        currency = "brl" if req.currency == "brl" else "usd"
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
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessário")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    modules_res = supabase_admin.table("course_modules").select("id, order_index, title").eq("course_id", course_id).order("order_index").execute()
    modules = modules_res.data or []

    progress_res = supabase_admin.table("user_course_progress").select("module_id, quiz_score, completed_at").eq("user_id", user["id"]).eq("course_id", course_id).execute()
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
async def complete_module(course_id: str, module_id: str, req: ModuleCompleteRequest, authorization: Optional[str] = Header(None)):
    user = await get_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login necessário")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="DB não configurado")

    mod_res = supabase_admin.table("course_modules").select("id, is_free").eq("id", module_id).eq("course_id", course_id).execute()
    if not mod_res.data:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")

    module = mod_res.data[0]

    if not module["is_free"]:
        access_res = supabase_admin.table("user_course_access").select("id").eq("user_id", user["id"]).eq("course_id", course_id).execute()
        if not access_res.data:
            raise HTTPException(status_code=403, detail="Compre o curso para acessar este módulo")

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

app.mount("/", StaticFiles(directory="dist", html=True), name="static")
