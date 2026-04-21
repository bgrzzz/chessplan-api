// ═══════════════════════════════════════════════════════════════════
// CourseCatalog.jsx — Catálogo de cursos
// Coloque em src/CourseCatalog.jsx
//
// Uso no App.jsx:
//   import { CourseCatalog } from './CourseCatalog'
//   <CourseCatalog session={session} onSelectCourse={(course) => ...} />
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Detecta Brasil
function isBrazil() {
  try {
    const lang = navigator.language || "";
    if (lang.toLowerCase().startsWith("pt-br")) return true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return tz.startsWith("America/Sao_Paulo") || tz.startsWith("America/Fortaleza") ||
           tz.startsWith("America/Recife") || tz.startsWith("America/Bahia") ||
           tz.startsWith("America/Belem") || tz.startsWith("America/Manaus");
  } catch { return false; }
}

// ── Difficulty badge ────────────────────────────────────────────
function DifficultyBadge({ level }) {
  const config = {
    iniciante: { label: "Iniciante", bg: "rgba(127,166,80,0.12)", color: "#7fa650" },
    intermediario: { label: "Intermediário", bg: "rgba(196,167,74,0.12)", color: "#c4a74a" },
    avancado: { label: "Avançado", bg: "rgba(232,93,93,0.12)", color: "#e85d5d" },
  };
  const c = config[level] || config.iniciante;
  return (
    <span style={{
      fontSize: 10, padding: "3px 8px", borderRadius: 4,
      background: c.bg, color: c.color, fontWeight: 600, letterSpacing: 0.3,
    }}>{c.label}</span>
  );
}

// ── Progress bar ────────────────────────────────────────────────
function ProgressBar({ completed, total }) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
          {completed}/{total} módulos
        </span>
        <span style={{ fontSize: 10, color: pct === 100 ? "#7fa650" : "#c4a74a", fontWeight: 600 }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: pct === 100 ? "#7fa650" : "linear-gradient(90deg, #8b7355, #c4a74a)",
          borderRadius: 2, transition: "width 0.4s",
        }} />
      </div>
    </div>
  );
}

// ── Course card ─────────────────────────────────────────────────
function CourseCard({ course, showBRL, session, onSelect, onPurchase }) {
  const price = showBRL
    ? `R$ ${parseFloat(course.price_brl).toFixed(2).replace(".", ",")}`
    : `$${parseFloat(course.price_usd).toFixed(2)}`;

  const discountPrice = course.is_pro
    ? showBRL
      ? `R$ ${(parseFloat(course.price_brl) * 0.7).toFixed(2).replace(".", ",")}`
      : `$${(parseFloat(course.price_usd) * 0.7).toFixed(2)}`
    : null;

  const isComplete = course.purchased && course.completed_modules >= course.total_modules;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: course.purchased ? "1px solid rgba(196,167,74,0.15)" : "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, overflow: "hidden",
      transition: "transform 0.15s, border-color 0.15s",
      cursor: "pointer",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(196,167,74,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = course.purchased ? "rgba(196,167,74,0.15)" : "rgba(255,255,255,0.06)"; }}
      onClick={() => onSelect(course)}
    >
      {/* Thumbnail / Header visual */}
      <div style={{
        height: 120, position: "relative",
        background: "linear-gradient(135deg, #1a1612 0%, #2a2318 50%, #1a1612 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Chess pattern overlay */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.06 }}>
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => (
              <div key={`${r}-${c}`} style={{
                position: "absolute",
                left: `${c * 12.5}%`, top: `${r * 25}%`,
                width: "12.5%", height: "25%",
                background: (r + c) % 2 === 0 ? "white" : "transparent",
              }} />
            ))
          )}
        </div>

        {/* Course icon */}
        <div style={{
          fontSize: 40, position: "relative", zIndex: 1,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
        }}>♟</div>

        {/* Purchased badge */}
        {course.purchased && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: isComplete ? "rgba(127,166,80,0.9)" : "rgba(196,167,74,0.9)",
            color: "#000", fontSize: 10, fontWeight: 700,
            padding: "3px 10px", borderRadius: 12,
          }}>
            {isComplete ? "Concluído" : "Em andamento"}
          </div>
        )}

        {/* Free preview badge */}
        {!course.purchased && course.free_preview_modules > 0 && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)",
            color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600,
            padding: "3px 10px", borderRadius: 12,
          }}>
            {course.free_preview_modules} módulos grátis
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 18px 18px" }}>
        {/* Title + difficulty */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>
            {course.title}
          </h3>
          <DifficultyBadge level={course.difficulty} />
        </div>

        {/* Description */}
        <p style={{
          margin: "0 0 12px", fontSize: 12, color: "rgba(255,255,255,0.4)",
          lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {course.description}
        </p>

        {/* Meta info */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          <span>{course.total_modules} módulos</span>
          {course.estimated_hours > 0 && <span>~{course.estimated_hours}h</span>}
          {course.rating_range && <span>{course.rating_range} ELO</span>}
        </div>

        {/* Progress bar (if purchased) */}
        {course.purchased && (
          <ProgressBar completed={course.completed_modules} total={course.total_modules} />
        )}

        {/* Price + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: course.purchased ? 12 : 0 }}>
          {course.purchased ? (
            <button onClick={(e) => { e.stopPropagation(); onSelect(course); }} style={{
              width: "100%", padding: "10px", borderRadius: 8, border: "none",
              background: isComplete ? "rgba(127,166,80,0.12)" : "#c4a74a",
              color: isComplete ? "#7fa650" : "#000",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              {isComplete ? "Revisar curso" : "Continuar estudando"}
            </button>
          ) : (
            <>
              <div>
                {discountPrice ? (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#c4a74a" }}>{discountPrice}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textDecoration: "line-through" }}>{price}</span>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(196,167,74,0.12)", color: "#c4a74a", fontWeight: 600 }}>-30% PRO</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#c4a74a" }}>{price}</span>
                )}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onPurchase(course); }} style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: "#c4a74a", color: "#000",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
                Comprar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: CourseCatalog
// ═══════════════════════════════════════════════════════════════════
export function CourseCatalog({ session, onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBRL, setShowBRL] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(null);

  // Auto-detect locale
  useEffect(() => { setShowBRL(isBrazil()); }, []);

  // Fetch courses
  useEffect(() => {
    setLoading(true);
    const headers = {};
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

    fetch(`${API_BASE}/courses`, { headers })
      .then(r => r.json())
      .then(data => { setCourses(data.courses || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  // Purchase handler
  const handlePurchase = useCallback(async (course) => {
    if (!session) {
      alert("Faça login para comprar cursos.");
      return;
    }
    setPurchaseLoading(course.id);
    try {
      const res = await fetch(`${API_BASE}/courses/${course.id}/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ currency: showBRL ? "brl" : "usd" }),
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
    setPurchaseLoading(null);
  }, [session, showBRL]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
        Carregando cursos...
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
        Nenhum curso disponível ainda.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
            Cursos
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            Aprenda aberturas com lições interativas no tabuleiro
          </div>
        </div>

        {/* Currency toggle */}
        <div style={{
          display: "inline-flex", background: "rgba(255,255,255,0.04)", borderRadius: 8,
          padding: 3, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <button onClick={() => setShowBRL(false)} style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            background: !showBRL ? "rgba(196,167,74,0.15)" : "transparent",
            color: !showBRL ? "#c4a74a" : "rgba(255,255,255,0.3)",
            fontWeight: !showBRL ? 600 : 400,
          }}>USD $</button>
          <button onClick={() => setShowBRL(true)} style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            background: showBRL ? "rgba(196,167,74,0.15)" : "transparent",
            color: showBRL ? "#c4a74a" : "rgba(255,255,255,0.3)",
            fontWeight: showBRL ? 600 : 400,
          }}>BRL R$</button>
        </div>
      </div>

      {/* Course grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
      }}>
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            showBRL={showBRL}
            session={session}
            onSelect={onSelectCourse}
            onPurchase={handlePurchase}
          />
        ))}
      </div>
    </div>
  );
}