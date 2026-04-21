// ═══════════════════════════════════════════════════════════════════
// BlunderHeatmap.jsx — Heatmap de erros no tabuleiro
// Coloque em src/BlunderHeatmap.jsx
// 
// Uso: <BlunderHeatmap games={games} />
//
// Analisa os PGNs para encontrar:
// - Casas onde o jogador mais perde peças (pontos cegos)
// - Casas onde o jogador mais captura (zonas de força)
// - Padrões de erro por cor (brancas vs pretas)
// ═══════════════════════════════════════════════════════════════════
import { useState, useMemo, useRef, useEffect } from "react";

// ── Extrai casas de captura do PGN ──────────────────────────────
function extractCaptures(moves, playerColor) {
  const losses = [];
  const captures = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!move || !move.includes("x")) continue;

    // 1. Extrai a casa onde a captura aconteceu (ex: d4)
    const clean = move.replace(/[+#!?]/g, "");
    const squareMatch = clean.match(/x([a-h][1-8])/);
    if (!squareMatch) continue;
    const square = squareMatch[1];

    // 2. Lógica de Recaptura (Lookahead)
    // Se houve um lance 'x' na MESMA casa logo em seguida, ignoramos como "troca"
    const nextMove = moves[i + 1];
    let isTrade = false;
    
    if (nextMove && nextMove.includes("x")) {
      const nextClean = nextMove.replace(/[+#!?]/g, "");
      const nextSquareMatch = nextClean.match(/x([a-h][1-8])/);
      if (nextSquareMatch && nextSquareMatch[1] === square) {
        isTrade = true; 
      }
    }

    // Se foi uma troca, não contamos nem como vitória nem como perda crítica
    if (isTrade) {
      i++; // Pulamos o próximo lance pois já sabemos que foi a recaptura da troca
      continue;
    }

    // 3. Se não foi troca, é uma perda ou ganho de material puro
    const isWhiteMove = i % 2 === 0;
    const isPlayerMove = (playerColor === "Brancas" && isWhiteMove) || 
                         (playerColor === "Pretas" && !isWhiteMove);

    if (isPlayerMove) {
      captures.push(square);
    } else {
      // O oponente capturou e você NÃO recapturou = Blunder/Perda de material
      losses.push(square);
    }
  }

  return { losses, captures };
}

// ── Gera mapa de calor por casa ─────────────────────────────────
function buildHeatmap(games, mode, colorFilter) {
  const map = {};
  // Inicializa todas as 64 casas
  for (let r = 1; r <= 8; r++) {
    for (let c = 0; c < 8; c++) {
      map[String.fromCharCode(97 + c) + r] = 0;
    }
  }

  for (const game of games) {
    if (!game.moves || game.moves.length === 0) continue;
    if (colorFilter !== "all" && game.playerColor !== colorFilter) continue;

    const { losses, captures } = extractCaptures(game.moves, game.playerColor);
    const squares = mode === "losses" ? losses : mode === "captures" ? captures : losses;

    for (const sq of squares) {
      if (map[sq] !== undefined) map[sq]++;
    }
  }

  return map;
}

// ── Encontra top N casas problemáticas ──────────────────────────
function getTopSquares(heatmap, n = 5) {
  return Object.entries(heatmap)
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// ── Cor do heatmap ──────────────────────────────────────────────
function getColor(value, maxValue, mode) {
  if (value === 0 || maxValue === 0) return "transparent";
  const intensity = Math.min(value / maxValue, 1);
  const alpha = 0.15 + intensity * 0.65;

  if (mode === "losses") return `rgba(232, 93, 93, ${alpha})`;
  if (mode === "captures") return `rgba(127, 166, 80, ${alpha})`;
  return `rgba(232, 93, 93, ${alpha})`;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export function BlunderHeatmap({ games = [] }) {
  const [mode, setMode] = useState("losses"); // "losses" | "captures"
  const [colorFilter, setColorFilter] = useState("all"); // "all" | "Brancas" | "Pretas"
  const containerRef = useRef(null);
  const [boardSize, setBoardSize] = useState(360);

  // Responsivo
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setBoardSize(Math.min(containerRef.current.offsetWidth, 420));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const gamesWithMoves = games.filter(g => g.moves && g.moves.length > 0);

  const heatmap = useMemo(() => buildHeatmap(gamesWithMoves, mode, colorFilter), [gamesWithMoves, mode, colorFilter]);
  const maxValue = useMemo(() => Math.max(...Object.values(heatmap), 1), [heatmap]);
  const topSquares = useMemo(() => getTopSquares(heatmap, 5), [heatmap]);

  const sq = boardSize / 8;

  if (gamesWithMoves.length === 0) return null;

  // Contadores
  const totalEvents = Object.values(heatmap).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "20px 22px", marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
            {mode === "losses" ? "🔴 Pontos Cegos" : "🟢 Zonas de Força"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
            {totalEvents} {mode === "losses" ? "peças perdidas" : "capturas"} em {gamesWithMoves.length} partidas
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMode("losses")} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
            background: mode === "losses" ? "rgba(232,93,93,0.15)" : "transparent",
            color: mode === "losses" ? "#e85d5d" : "rgba(255,255,255,0.3)",
            fontWeight: mode === "losses" ? 600 : 400,
          }}>Pontos cegos</button>
          <button onClick={() => setMode("captures")} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
            background: mode === "captures" ? "rgba(127,166,80,0.15)" : "transparent",
            color: mode === "captures" ? "#7fa650" : "rgba(255,255,255,0.3)",
            fontWeight: mode === "captures" ? 600 : 400,
          }}>Zonas de força</button>
        </div>
      </div>

      {/* Filtro por cor */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[
          { k: "all", l: "Todas" },
          { k: "Brancas", l: "♔ Brancas" },
          { k: "Pretas", l: "♚ Pretas" },
        ].map(({ k, l }) => (
          <button key={k} onClick={() => setColorFilter(k)} style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer",
            background: colorFilter === k ? "rgba(255,255,255,0.08)" : "transparent",
            color: colorFilter === k ? "#fff" : "rgba(255,255,255,0.25)",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Tabuleiro com overlay */}
        <div ref={containerRef} style={{ flex: 1, minWidth: 280, maxWidth: 420 }}>
          <div style={{
            display: "inline-grid",
            gridTemplateColumns: `repeat(8, ${sq}px)`,
            gridTemplateRows: `repeat(8, ${sq}px)`,
            borderRadius: 8, overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.08)",
          }}>
            {Array.from({ length: 8 }, (_, ri) =>
              Array.from({ length: 8 }, (_, ci) => {
                const isLight = (ri + ci) % 2 === 0;
                const squareName = String.fromCharCode(97 + ci) + (8 - ri);
                const value = heatmap[squareName] || 0;
                const overlay = getColor(value, maxValue, mode);

                return (
                  <div key={`${ri}-${ci}`} style={{
                    width: sq, height: sq,
                    background: isLight ? "#e8dcc8" : "#8b6b4a",
                    position: "relative",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {/* Overlay de calor */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: overlay,
                      transition: "background 0.3s",
                    }} />

                    {/* Número de eventos */}
                    {value > 0 && (
                      <span style={{
                        position: "relative", zIndex: 1,
                        fontSize: sq > 40 ? 14 : 11,
                        fontWeight: 700,
                        color: value >= maxValue * 0.6
                          ? "#fff"
                          : mode === "losses" ? "rgba(232,93,93,0.8)" : "rgba(127,166,80,0.8)",
                        textShadow: value >= maxValue * 0.6 ? "0 1px 3px rgba(0,0,0,0.5)" : "none",
                      }}>{value}</span>
                    )}

                    {/* Coordenadas */}
                    {ci === 0 && (
                      <span style={{
                        position: "absolute", top: 1, left: 2,
                        fontSize: 8, fontWeight: 600, zIndex: 1,
                        color: isLight ? "rgba(139,107,74,0.4)" : "rgba(232,220,200,0.4)",
                      }}>{8 - ri}</span>
                    )}
                    {ri === 7 && (
                      <span style={{
                        position: "absolute", bottom: 0, right: 2,
                        fontSize: 8, fontWeight: 600, zIndex: 1,
                        color: isLight ? "rgba(139,107,74,0.4)" : "rgba(232,220,200,0.4)",
                      }}>{String.fromCharCode(97 + ci)}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel de insights */}
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Top casas */}
          <div style={{
            background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
              {mode === "losses" ? "Casas mais perigosas" : "Casas mais fortes"}
            </div>
            {topSquares.length === 0 ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Sem dados suficientes</div>
            ) : (
              topSquares.map(([square, count], i) => {
                const pct = Math.round((count / maxValue) * 100);
                const barColor = mode === "losses" ? "#e85d5d" : "#7fa650";
                return (
                  <div key={square} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                      <span style={{
                        fontSize: 14, fontWeight: 700,
                        color: i === 0 ? (mode === "losses" ? "#e85d5d" : "#7fa650") : "#fff",
                      }}>
                        {square.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        {count}x
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: barColor, borderRadius: 2,
                        transition: "width 0.3s",
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Insight textual */}
          {topSquares.length > 0 && (
            <div style={{
              background: mode === "losses" ? "rgba(232,93,93,0.06)" : "rgba(127,166,80,0.06)",
              border: `1px solid ${mode === "losses" ? "rgba(232,93,93,0.12)" : "rgba(127,166,80,0.12)"}`,
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                {mode === "losses" ? (
                  <>
                    Você perde mais peças na casa <strong style={{ color: "#e85d5d" }}>{topSquares[0][0].toUpperCase()}</strong>.
                    {topSquares[0][0][0] >= "e" ?
                      " Fique atento ao flanco do rei — considere fortalecer a defesa nessa zona." :
                      " O flanco da dama está vulnerável — cuidado com ataques na ala."}
                  </>
                ) : (
                  <>
                    Sua zona de maior domínio é <strong style={{ color: "#7fa650" }}>{topSquares[0][0].toUpperCase()}</strong>.
                    {" Continue explorando capturas nessa região do tabuleiro."}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Legenda */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
            <div style={{
              width: 60, height: 8, borderRadius: 4,
              background: mode === "losses"
                ? "linear-gradient(90deg, transparent, rgba(232,93,93,0.8))"
                : "linear-gradient(90deg, transparent, rgba(127,166,80,0.8))",
            }} />
            <span>Mais {mode === "losses" ? "perdas" : "capturas"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
