// ═══════════════════════════════════════════════════════════════════
// PricingPage.jsx — Página de pricing com geolocalização
// Cole em src/PricingPage.jsx
// 
// No App.jsx, importe e use:
//   import { PricingPage, UpgradeModal } from './PricingPage'
//
// Para mostrar a página de pricing:
//   const [showPricing, setShowPricing] = useState(false)
//   {showPricing && <PricingPage onClose={() => setShowPricing(false)} session={session} />}
//
// Para o modal de upgrade (quando free user tenta feature pro):
//   <UpgradeModal feature="Análises IA ilimitadas" onClose={...} onUpgrade={...} />
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL

// ── Detecta se o usuário é brasileiro ───────────────────────────
function detectBrazil() {
  try {
    const lang = navigator.language || navigator.userLanguage || "";
    if (lang.toLowerCase().startsWith("pt-br")) return true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("America/Sao_Paulo") || tz.startsWith("America/Fortaleza") || 
        tz.startsWith("America/Recife") || tz.startsWith("America/Bahia") ||
        tz.startsWith("America/Belem") || tz.startsWith("America/Manaus") ||
        tz.startsWith("America/Cuiaba") || tz.startsWith("America/Porto_Velho") ||
        tz.startsWith("America/Rio_Branco") || tz.startsWith("America/Maceio") ||
        tz.startsWith("America/Araguaina") || tz.startsWith("America/Noronha")) return true;
  } catch {}
  return false;
}

// ── Pricing config ──────────────────────────────────────────────
const PLANS = {
  free: {
    name: "Free",
    features: [
      { text: "Dashboard + ratings lado a lado", included: true },
      { text: "Tabuleiro interativo com navegação", included: true },
      
      { text: "Opening Explorer (top 5)", included: true },
      { text: "Gráfico de rating (30 dias)", included: true },
      { text: "3 análises IA por dia", included: true, highlight: true },
      { text: "Análises IA ilimitadas", included: false },
      { text: "Weakness detector", included: false },
      
    ],
  },
  pro: {
    name: "Pro",
    features: [
      { text: "Tudo do Free +", included: true, separator: true },
      { text: "Análises IA ilimitadas", included: true, highlight: true },
      { text: "Partidas ilimitadas", included: true },
      { text: "Opening Explorer completo", included: true },
      { text: "Weakness detector cross-platform", included: true },
      
    
      { text: "Histórico salvo no banco", included: true },
     
      { text: "Suporte prioritário", included: true },
    ],
  },
};

const PRICES = {
  brl: { amount: "R$ 9,90", period: "/mês", currency: "brl", annual: "R$ 99,90/ano", saving: "Economize R$ 18,90" },
  usd: { amount: "$4.90", period: "/mo", currency: "usd", annual: "$49.99/yr", saving: "Save $9.89" },
};

// ── Check / X icons ─────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" fill="rgba(127,166,80,0.15)" stroke="#7fa650" strokeWidth="0.5" />
      <path d="M5 8.2L7 10.2L11 6" stroke="#7fa650" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ── Feature row ─────────────────────────────────────────────────
function FeatureRow({ text, included, highlight, separator }) {
  if (separator) {
    return (
      <div style={{ fontSize: 12, color: "#c4a74a", fontWeight: 600, padding: "4px 0 2px", marginTop: 4 }}>
        {text}
      </div>
    );
  }
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "5px 0",
      opacity: included ? 1 : 0.35,
    }}>
      {included ? <CheckIcon /> : <XIcon />}
      <span style={{
        fontSize: 13, color: included ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
        fontWeight: highlight ? 600 : 400,
      }}>
        {text}
        {highlight && included && (
          <span style={{
            marginLeft: 8, fontSize: 9, padding: "2px 6px", borderRadius: 4,
            background: "rgba(196,167,74,0.15)", color: "#c4a74a", fontWeight: 600,
            verticalAlign: "middle",
          }}>DESTAQUE</span>
        )}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PRICING PAGE (fullscreen overlay)
// ═══════════════════════════════════════════════════════════════════
export function PricingPage({ onClose, session }) {
  const [isBRL, setIsBRL] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [portalLoading, setPortalLoading] = useState(false);

  // Auto-detect locale
  useEffect(() => {
    setIsBRL(detectBrazil());
  }, []);

  // Fetch current plan
  useEffect(() => {
    if (!session) return;
    const token = session.access_token;
    fetch(`${API_BASE}/user/plan`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setCurrentPlan(data.plan || "free"))
      .catch(() => {});
  }, [session]);

  const price = isBRL ? PRICES.brl : PRICES.usd;

  const handleCheckout = useCallback(async () => {
    if (!session) {
      alert("Faça login antes de assinar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stripe/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ currency: price.currency }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.detail || "Erro ao criar checkout");
      }
    } catch (e) {
      alert("Erro de conexão: " + e.message);
    }
    setLoading(false);
  }, [session, price.currency]);

  const handleManage = useCallback(async () => {
    if (!session) return;
    setPortalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stripe/create-portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    setPortalLoading(false);
  }, [session]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#111214", borderRadius: 24, maxWidth: 820, width: "100%",
        border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "32px 36px 20px", textAlign: "center", position: "relative" }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 16, right: 20, background: "none", border: "none",
            color: "rgba(255,255,255,0.3)", fontSize: 20, cursor: "pointer", padding: 4,
          }}>✕</button>

          <div style={{ fontSize: 13, color: "#c4a74a", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>
            ♟ CHESSPLAN
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
            Escolha seu plano
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>
            Análises ilimitadas e ferramentas avançadas para evoluir no xadrez
          </p>

          {/* Currency toggle */}
          <div style={{
            display: "inline-flex", background: "rgba(255,255,255,0.04)", borderRadius: 8,
            padding: 3, border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <button onClick={() => setIsBRL(false)} style={{
              fontSize: 12, padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: !isBRL ? "rgba(196,167,74,0.15)" : "transparent",
              color: !isBRL ? "#c4a74a" : "rgba(255,255,255,0.3)",
              fontWeight: !isBRL ? 600 : 400,
            }}>USD $</button>
            <button onClick={() => setIsBRL(true)} style={{
              fontSize: 12, padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: isBRL ? "rgba(196,167,74,0.15)" : "transparent",
              color: isBRL ? "#c4a74a" : "rgba(255,255,255,0.3)",
              fontWeight: isBRL ? 600 : 400,
            }}>BRL R$</button>
          </div>
        </div>

        {/* Plans */}
        <div style={{ display: "flex", gap: 16, padding: "0 36px 32px" }}>

          {/* FREE plan */}
          <div style={{
            flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 16,
            border: currentPlan === "free" ? "1px solid rgba(127,166,80,0.3)" : "1px solid rgba(255,255,255,0.06)",
            padding: "28px 24px", display: "flex", flexDirection: "column",
          }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
              Free
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              {isBRL ? "R$ 0" : "$0"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>
              Para sempre
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
              {PLANS.free.features.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>

            {currentPlan === "free" ? (
              <div style={{
                textAlign: "center", padding: "10px", borderRadius: 10,
                background: "rgba(127,166,80,0.08)", border: "1px solid rgba(127,166,80,0.15)",
                fontSize: 13, color: "#7fa650", fontWeight: 600,
              }}>● Plano atual</div>
            ) : (
              <div style={{
                textAlign: "center", padding: "10px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", fontSize: 13,
                color: "rgba(255,255,255,0.3)",
              }}>Plano básico</div>
            )}
          </div>

          {/* PRO plan */}
          <div style={{
            flex: 1, borderRadius: 16, padding: "28px 24px",
            background: "rgba(196,167,74,0.04)",
            border: currentPlan === "pro" ? "1px solid rgba(196,167,74,0.4)" : "1px solid rgba(196,167,74,0.12)",
            display: "flex", flexDirection: "column", position: "relative",
          }}>
            {/* Popular badge */}
            <div style={{
              position: "absolute", top: -10, right: 20, background: "#c4a74a",
              color: "#000", fontSize: 10, fontWeight: 700, padding: "3px 12px",
              borderRadius: 20, letterSpacing: 0.5,
            }}>POPULAR</div>

            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "#c4a74a", marginBottom: 6 }}>
              Pro
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: "#fff" }}>{price.amount}</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{price.period}</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>
              Cancele quando quiser
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
              {PLANS.pro.features.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>

            {currentPlan === "pro" ? (
              <button onClick={handleManage} disabled={portalLoading} style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: "rgba(196,167,74,0.15)", color: "#c4a74a",
                fontSize: 13, fontWeight: 600, cursor: portalLoading ? "wait" : "pointer",
              }}>
                {portalLoading ? "Carregando..." : "Gerenciar assinatura"}
              </button>
            ) : (
              <button onClick={handleCheckout} disabled={loading} style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "none",
                background: loading ? "rgba(196,167,74,0.3)" : "#c4a74a",
                color: "#000", fontSize: 14, fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                transition: "all 0.15s",
              }}>
                {loading ? "Redirecionando..." : `Assinar Pro — ${price.amount}${price.period}`}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 36px 24px", textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.6,
        }}>
          Pagamento seguro via Stripe · Cancele a qualquer momento · Sem compromisso
          <br />
          {isBRL ? "Preço em Real brasileiro" : "Price in US Dollars"} · {isBRL ? "Detectado automaticamente pela sua localização" : "Auto-detected from your location"}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// UPGRADE MODAL (paywall suave para features Pro)
// ═══════════════════════════════════════════════════════════════════
export function UpgradeModal({ feature, onClose, onUpgrade, remaining = 0, limit = 3 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#16171a", borderRadius: 20, maxWidth: 420, width: "100%",
        padding: "36px 32px", border: "1px solid rgba(196,167,74,0.15)",
        textAlign: "center",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ fontSize: 48, marginBottom: 16 }}>♛</div>

        <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
          Faça upgrade para o Pro
        </h3>

        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 20px", lineHeight: 1.6 }}>
          {remaining === 0
            ? `Você usou suas ${limit} análises gratuitas de hoje.`
            : `"${feature}" é exclusivo do plano Pro.`
          }
        </p>

        <div style={{
          background: "rgba(196,167,74,0.06)", borderRadius: 12, padding: "16px 20px",
          marginBottom: 24, textAlign: "left",
        }}>
          <div style={{ fontSize: 12, color: "#c4a74a", fontWeight: 600, marginBottom: 10 }}>
            Com o Pro você ganha:
          </div>
          {[
            "Análises IA ilimitadas",
            "Weakness detector cross-platform",
            "Histórico completo salvo",
            "Opening Explorer sem limites",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <CheckIcon />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer",
          }}>
            Depois
          </button>
          <button onClick={onUpgrade} style={{
            flex: 2, padding: "12px", borderRadius: 10, border: "none",
            background: "#c4a74a", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>
            Ver planos
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PLAN BADGE (para mostrar na sidebar/header)
// ═══════════════════════════════════════════════════════════════════
export function PlanBadge({ plan, onClick }) {
  if (plan === "pro") {
    return (
      <span onClick={onClick} style={{
        fontSize: 10, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
        background: "rgba(196,167,74,0.15)", color: "#c4a74a",
        fontWeight: 700, letterSpacing: 0.5, border: "1px solid rgba(196,167,74,0.2)",
      }}>PRO</span>
    );
  }
  return (
    <span onClick={onClick} style={{
      fontSize: 10, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
      background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)",
      fontWeight: 600, letterSpacing: 0.5, border: "1px solid rgba(255,255,255,0.06)",
    }}>FREE — Upgrade</span>
  );
}
