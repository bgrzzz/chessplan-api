// ═══════════════════════════════════════════════════════════════════
// LandingPage.jsx — Landing page do ChessPlan
// Coloque em src/LandingPage.jsx
//
// Uso no App.jsx: renderiza quando NÃO está logado e mainView === "landing"
// ou como página inicial para visitantes
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";

export function LandingPage({ onLogin, onPricing }) {
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection observer for fade-in
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisibleSections((prev) => ({ ...prev, [e.target.id]: true }));
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const fadeIn = (id, delay = 0) => ({
    opacity: visibleSections[id] ? 1 : 0,
    transform: visibleSections[id] ? "translateY(0)" : "translateY(30px)",
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  return (
    <div style={{ background: "#0a0908", color: "#fff", fontFamily: "'Cormorant Garamond', Georgia, serif", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .lp-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; font-family: 'DM Sans', sans-serif; border: none; }
        .lp-btn-gold { background: #c4a74a; color: #0a0908; }
        .lp-btn-gold:hover { background: #d4b85a; transform: translateY(-1px); }
        .lp-btn-outline { background: transparent; border: 1px solid rgba(196,167,74,0.3); color: #c4a74a; }
        .lp-btn-outline:hover { border-color: #c4a74a; background: rgba(196,167,74,0.06); }
        .lp-section { padding: 100px 24px; max-width: 1100px; margin: 0 auto; }
        .lp-badge { display: inline-block; font-size: 12px; padding: 4px 14px; border-radius: 20px; background: rgba(196,167,74,0.1); color: #c4a74a; font-family: 'DM Sans', sans-serif; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        .lp-float { animation: float 6s ease-in-out infinite; }
        .lp-hero-enter { animation: fadeUp 1s ease forwards; }
        .lp-hero-enter-d1 { animation: fadeUp 1s ease 0.2s forwards; opacity: 0; }
        .lp-hero-enter-d2 { animation: fadeUp 1s ease 0.4s forwards; opacity: 0; }
        .lp-hero-enter-d3 { animation: fadeUp 1s ease 0.6s forwards; opacity: 0; }
        .lp-screenshot { border-radius: 12px; border: 1px solid rgba(196,167,74,0.12); width: 100%; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        @media (max-width: 768px) {
          .lp-hero-grid { flex-direction: column !important; text-align: center !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; }
          .lp-pricing-grid { grid-template-columns: 1fr !important; }
          .lp-section { padding: 60px 20px; }
        }
      `}</style>

      {/* ═══ NAV ═══ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 32px",
        background: scrollY > 50 ? "rgba(10,9,8,0.95)" : "transparent",
        backdropFilter: scrollY > 50 ? "blur(12px)" : "none",
        borderBottom: scrollY > 50 ? "1px solid rgba(196,167,74,0.08)" : "none",
        transition: "all 0.3s",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#c4a74a", fontFamily: "'Cormorant Garamond', serif" }}>
          ♟ ChessPlan
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onPricing} className="lp-btn lp-btn-outline" style={{ padding: "8px 20px", fontSize: 13 }}>
            Ver planos
          </button>
          <button onClick={onLogin} className="lp-btn lp-btn-gold" style={{ padding: "8px 20px", fontSize: 13 }}>
            Entrar
          </button>
        </div>
      </nav>

      {/* ═══ HERO (dark) ═══ */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        position: "relative", overflow: "hidden",
        background: "radial-gradient(ellipse at 30% 50%, rgba(196,167,74,0.06) 0%, transparent 60%), #0a0908",
      }}>
        {/* Chess pattern bg */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.02 }}>
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 16 }, (_, c) => (
              <div key={`${r}-${c}`} style={{
                position: "absolute",
                left: `${c * 6.25}%`, top: `${r * 12.5}%`,
                width: "6.25%", height: "12.5%",
                background: (r + c) % 2 === 0 ? "#fff" : "transparent",
              }} />
            ))
          )}
        </div>

        {/* Floating pieces */}
        <div style={{ position: "absolute", top: "15%", right: "8%", fontSize: 60, opacity: 0.06 }} className="lp-float">♛</div>
        <div style={{ position: "absolute", bottom: "20%", left: "5%", fontSize: 48, opacity: 0.04, animationDelay: "2s" }} className="lp-float">♞</div>
        <div style={{ position: "absolute", top: "60%", right: "15%", fontSize: 40, opacity: 0.03, animationDelay: "4s" }} className="lp-float">♜</div>

        <div className="lp-section lp-hero-grid" style={{ display: "flex", gap: 60, alignItems: "center", paddingTop: 120 }}>
          {/* Left: copy */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div className="lp-hero-enter">
              <span className="lp-badge">Análise de xadrez com IA</span>
            </div>
            <h1 className="lp-hero-enter-d1" style={{
              fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700,
              lineHeight: 1.1, marginBottom: 24, letterSpacing: "-1px",
            }}>
              Evolua no xadrez com
              <span style={{ color: "#c4a74a", display: "block" }}>inteligência artificial</span>
            </h1>
            <p className="lp-hero-enter-d2" style={{
              fontSize: 18, color: "rgba(255,255,255,0.55)", lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif", maxWidth: 480, marginBottom: 36,
            }}>
              Conecte seu Lichess ou Chess.com e receba análises personalizadas,
              descubra seus pontos cegos, e domine aberturas com cursos interativos no tabuleiro.
            </p>
            <div className="lp-hero-enter-d3" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button onClick={onLogin} className="lp-btn lp-btn-gold">
                Começar grátis →
              </button>
              <button onClick={onPricing} className="lp-btn lp-btn-outline">
                Ver planos
              </button>
            </div>
            <p className="lp-hero-enter-d3" style={{
              fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 16,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Sem cartão de crédito · 3 análises IA grátis por dia
            </p>
          </div>

          {/* Right: screenshot mockup */}
          <div style={{ flex: 1, minWidth: 300, position: "relative" }} className="lp-hero-enter-d2">
            <div style={{
              background: "linear-gradient(135deg, rgba(196,167,74,0.08), transparent)",
              borderRadius: 20, padding: 20,
              border: "1px solid rgba(196,167,74,0.08)",
            }}>
              <img
                src="/screenshots/dashboard.png"
                alt="Dashboard do ChessPlan mostrando gráfico de rating, rivais frequentes e opening explorer"
                className="lp-screenshot"
                style={{ width: "100%" }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              {/* Fallback se não tiver screenshot */}
              <div style={{
                display: "none", height: 360, borderRadius: 12,
                background: "rgba(196,167,74,0.04)", border: "1px solid rgba(196,167,74,0.1)",
                alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
              }}>
                <div style={{ fontSize: 48 }}>♟</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
                  Dashboard preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES (light-ish) ═══ */}
      <section style={{ background: "#0f0e0c" }}>
        <div className="lp-section" id="features" data-animate>
          <div style={{ textAlign: "center", marginBottom: 64 }} >
            <span className="lp-badge" style={fadeIn("features")}>Ferramentas poderosas</span>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600,
              lineHeight: 1.2, marginBottom: 16, ...fadeIn("features", 0.1),
            }}>
              Tudo que você precisa para<br />
              <span style={{ color: "#c4a74a" }}>subir de rating</span>
            </h2>
            <p style={{
              fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 500,
              margin: "0 auto", fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.7, ...fadeIn("features", 0.2),
            }}>
              Conecte suas contas, analise com IA, descubra fraquezas e estude aberturas.
              Tudo numa plataforma só.
            </p>
          </div>

          <div className="lp-features-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}>
            {[
              {
                icon: "🤖",
                title: "Treinador com IA",
                desc: "O Gemini analisa suas partidas e explica erros em linguagem simples, adaptada ao seu rating.",
                color: "#c4a74a",
              },
              {
                icon: "📊",
                title: "Evolução de rating",
                desc: "Gráficos de rating do Lichess e Chess.com lado a lado. Veja sua evolução por formato de jogo.",
                color: "#7fa650",
              },
              {
                icon: "🔍",
                title: "Opening Explorer",
                desc: "Descubra suas aberturas mais jogadas, win rate por variação, e quais são seus pontos fracos.",
                color: "#e85d5d",
              },
              {
                icon: "🔴",
                title: "Heatmap de erros",
                desc: "Visualize no tabuleiro onde você mais perde peças. Encontre seus pontos cegos e zonas de força.",
                color: "#e85d5d",
              },
              {
                icon: "⚔️",
                title: "Rivais frequentes",
                desc: "Rastreie seu histórico contra cada oponente. Placar, tendências, e partidas recentes.",
                color: "#c4a74a",
              },
              {
                icon: "📚",
                title: "Cursos interativos",
                desc: "Aprenda Siciliana, Ruy López e Italiana com lições no tabuleiro. Comentários em cada lance.",
                color: "#7fa650",
              },
            ].map((f, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 16, padding: "28px 24px",
                ...fadeIn("features", 0.1 + i * 0.08),
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${f.color}12`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 20, marginBottom: 16,
                }}>{f.icon}</div>
                <h3 style={{
                  fontSize: 17, fontWeight: 600, marginBottom: 8,
                  fontFamily: "'DM Sans', sans-serif",
                }}>{f.title}</h3>
                <p style={{
                  fontSize: 14, color: "rgba(255,255,255,0.4)",
                  lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
                }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section style={{ background: "#0a0908" }}>
        <div className="lp-section" style={{ paddingTop: 60, paddingBottom: 60 }}>
          <div style={{
            display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap",
            textAlign: "center", fontFamily: "'DM Sans', sans-serif",
          }}>
            {[
              { n: "216+", l: "Partidas analisadas" },
              { n: "53", l: "Aberturas rastreadas" },
              { n: "3", l: "Cursos disponíveis" },
              { n: "∞", l: "Potencial de evolução" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#c4a74a", fontFamily: "'Cormorant Garamond', serif" }}>{s.n}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING (lighter bg) ═══ */}
      <section style={{ background: "#12110f" }}>
        <div className="lp-section" id="pricing" data-animate>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="lp-badge" style={fadeIn("pricing")}>Planos simples</span>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600,
              lineHeight: 1.2, ...fadeIn("pricing", 0.1),
            }}>
              Escolha seu plano
            </h2>
            <p style={{
              fontSize: 15, color: "rgba(255,255,255,0.35)", marginTop: 12,
              fontFamily: "'DM Sans', sans-serif", ...fadeIn("pricing", 0.2),
            }}>
              Comece grátis. Evolua quando quiser.
            </p>
          </div>

          <div className="lp-pricing-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 20, maxWidth: 700, margin: "0 auto",
          }}>
            {/* Free */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: "32px 28px",
              ...fadeIn("pricing", 0.15),
            }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Free</div>
              <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 4 }}>R$ 0</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: 24 }}>Para sempre</div>
              {[
                "Dashboard + ratings",
                "Tabuleiro interativo",
                "Opening Explorer (top 5)",
                "3 análises IA por dia",
                "Gráfico de rating (30 dias)",
              ].map((f, i) => (
                <div key={i} style={{
                  fontSize: 14, color: "rgba(255,255,255,0.5)",
                  padding: "6px 0", fontFamily: "'DM Sans', sans-serif",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: "#7fa650" }}>✓</span> {f}
                </div>
              ))}
              <button onClick={onLogin} className="lp-btn lp-btn-outline" style={{
                width: "100%", justifyContent: "center", marginTop: 24,
              }}>
                Começar grátis
              </button>
            </div>

            {/* Pro */}
            <div style={{
              background: "rgba(196,167,74,0.04)",
              border: "1px solid rgba(196,167,74,0.15)",
              borderRadius: 16, padding: "32px 28px",
              position: "relative",
              ...fadeIn("pricing", 0.25),
            }}>
              <div style={{
                position: "absolute", top: -12, right: 20,
                background: "#c4a74a", color: "#000", fontSize: 11,
                fontWeight: 700, padding: "4px 14px", borderRadius: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}>POPULAR</div>
              <div style={{ fontSize: 12, color: "#c4a74a", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: "#c4a74a" }}>R$ 9,90</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>/mês</span>
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: 24 }}>Cancele quando quiser</div>
              {[
                { t: "Análises IA ilimitadas", hl: true },
                { t: "Partidas ilimitadas" },
                { t: "Opening Explorer completo" },
                { t: "Heatmap de erros" },
                { t: "Gráfico de rating (1 ano)" },
                { t: "30% off nos cursos" },
                { t: "Suporte prioritário" },
              ].map((f, i) => (
                <div key={i} style={{
                  fontSize: 14, color: f.hl ? "#fff" : "rgba(255,255,255,0.5)",
                  padding: "6px 0", fontFamily: "'DM Sans', sans-serif",
                  display: "flex", alignItems: "center", gap: 8,
                  fontWeight: f.hl ? 600 : 400,
                }}>
                  <span style={{ color: "#c4a74a" }}>✓</span> {f.t || f}
                  {f.hl && <span style={{ fontSize: 10, background: "rgba(196,167,74,0.15)", color: "#c4a74a", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>DESTAQUE</span>}
                </div>
              ))}
              <button onClick={onPricing} className="lp-btn lp-btn-gold" style={{
                width: "100%", justifyContent: "center", marginTop: 24,
              }}>
                Assinar Pro — R$ 9,90/mês
              </button>
            </div>
          </div>

          {/* Cursos */}
          <div style={{
            textAlign: "center", marginTop: 40, padding: "28px 24px",
            background: "rgba(255,255,255,0.02)", borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.05)",
            ...fadeIn("pricing", 0.35),
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
              📚 Cursos avulsos a partir de R$ 29,90
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>
              Siciliana · Ruy López · Italiana — Aprenda aberturas com lições interativas no tabuleiro.
              Assinantes Pro ganham 30% de desconto.
            </p>
            <button onClick={onLogin} className="lp-btn lp-btn-outline" style={{ fontSize: 13, padding: "10px 24px" }}>
              Ver catálogo de cursos
            </button>
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section style={{
        background: "radial-gradient(ellipse at 50% 100%, rgba(196,167,74,0.08) 0%, transparent 60%), #0a0908",
        textAlign: "center",
      }}>
        <div className="lp-section" id="cta" data-animate style={{ paddingBottom: 80 }}>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600,
            lineHeight: 1.2, marginBottom: 16, ...fadeIn("cta"),
          }}>
            Pronto para evoluir?
          </h2>
          <p style={{
            fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 32,
            fontFamily: "'DM Sans', sans-serif", maxWidth: 400, margin: "0 auto 32px",
            ...fadeIn("cta", 0.1),
          }}>
            Junte-se a jogadores que estão usando IA para subir de rating.
            Comece grátis, sem compromisso.
          </p>
          <div style={{ ...fadeIn("cta", 0.2) }}>
            <button onClick={onLogin} className="lp-btn lp-btn-gold" style={{ fontSize: 16, padding: "16px 40px" }}>
              Criar conta grátis →
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "32px 24px",
        textAlign: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#c4a74a", marginBottom: 16, fontFamily: "'Cormorant Garamond', serif" }}>
          ♟ ChessPlan
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { l: "Termos de Uso", v: "termos" },
            { l: "Privacidade", v: "privacidade" },
            { l: "Reembolso", v: "reembolso" },
          ].map((link) => (
            <span
              key={link.v}
              onClick={() => window.location.hash = link.v}
              style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", cursor: "pointer", textDecoration: "none" }}
            >{link.l}</span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>
          © 2025 ChessPlan. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
