// ═══════════════════════════════════════════════════════════════════
// OpeningExplorer.jsx — Análise profunda de aberturas
// Cole este arquivo em src/OpeningExplorer.jsx
// Depois importe no App.jsx: import { OpeningExplorer } from './OpeningExplorer'
// E adicione: <OpeningExplorer games={games} />
// ═══════════════════════════════════════════════════════════════════
import { useState, useMemo, useRef, useEffect } from "react";

// ── Helpers ──────────────────────────────────────────────────────
function buildOpeningTree(games) {
  // Agrupa por nome de abertura, depois por variação (se houver " : " ou " - ")
  const tree = {};

  for (const g of games) {
    const raw = g.opening || "Desconhecida";
    // Muitas aberturas do Lichess vêm como "Sicilian Defense: Najdorf Variation"
    const parts = raw.split(/:\s*/);
    const family = parts[0].trim();
    const variation = parts.length > 1 ? parts.slice(1).join(": ").trim() : "Linha principal";

    if (!tree[family]) {
      tree[family] = {
        name: family,
        wins: 0, losses: 0, draws: 0, total: 0,
        platforms: new Set(),
        variations: {},
        games: [],
        eloSum: 0, eloCount: 0,
        asWhite: { w: 0, l: 0, d: 0 },
        asBlack: { w: 0, l: 0, d: 0 },
      };
    }

    const fam = tree[family];
    fam.total++;
    fam.platforms.add(g.platform);
    fam.games.push(g);
    if (g.result === "win") fam.wins++;
    else if (g.result === "loss") fam.losses++;
    else fam.draws++;

    // Per-color stats
    const colorKey = g.playerColor === "Brancas" ? "asWhite" : "asBlack";
    if (g.result === "win") fam[colorKey].w++;
    else if (g.result === "loss") fam[colorKey].l++;
    else fam[colorKey].d++;

    // Variations
    if (!fam.variations[variation]) {
      fam.variations[variation] = {
        name: variation, wins: 0, losses: 0, draws: 0, total: 0,
        platforms: new Set(), games: [],
        asWhite: { w: 0, l: 0, d: 0 },
        asBlack: { w: 0, l: 0, d: 0 },
      };
    }
    const v = fam.variations[variation];
    v.total++; v.platforms.add(g.platform); v.games.push(g);
    if (g.result === "win") v.wins++;
    else if (g.result === "loss") v.losses++;
    else v.draws++;
    const vc = g.playerColor === "Brancas" ? "asWhite" : "asBlack";
    if (g.result === "win") v[vc].w++;
    else if (g.result === "loss") v[vc].l++;
    else v[vc].d++;
  }

  return Object.values(tree).sort((a, b) => b.total - a.total);
}

function detectWeaknesses(tree) {
  const weaknesses = [];

  for (const fam of tree) {
    if (fam.total < 3) continue;
    const winRate = fam.total > 0 ? (fam.wins / fam.total) * 100 : 0;

    // Low win rate overall
    if (winRate < 35 && fam.total >= 3) {
      weaknesses.push({
        type: "low_winrate",
        opening: fam.name,
        winRate: Math.round(winRate),
        total: fam.total,
        cross: fam.platforms.size > 1,
        message: `Win rate de apenas ${Math.round(winRate)}% em ${fam.total} partidas`,
      });
    }

    // Check color imbalance
    const wTotal = fam.asWhite.w + fam.asWhite.l + fam.asWhite.d;
    const bTotal = fam.asBlack.w + fam.asBlack.l + fam.asBlack.d;
    if (wTotal >= 2 && bTotal >= 2) {
      const wWinRate = (fam.asWhite.w / wTotal) * 100;
      const bWinRate = (fam.asBlack.w / bTotal) * 100;
      if (Math.abs(wWinRate - bWinRate) > 30) {
        const weakColor = wWinRate < bWinRate ? "Brancas" : "Pretas";
        const weakRate = Math.round(Math.min(wWinRate, bWinRate));
        weaknesses.push({
          type: "color_imbalance",
          opening: fam.name,
          weakColor,
          weakRate,
          message: `Só ${weakRate}% de vitórias jogando de ${weakColor}`,
        });
      }
    }

    // Cross-platform weakness (same opening, bad on both)
    if (fam.platforms.size > 1 && winRate < 40) {
      weaknesses.push({
        type: "cross_platform",
        opening: fam.name,
        winRate: Math.round(winRate),
        message: `Problema recorrente em ambas as plataformas (${Math.round(winRate)}% win rate)`,
      });
    }

    // Variation-specific weaknesses
    for (const v of Object.values(fam.variations)) {
      if (v.total >= 2) {
        const vWinRate = (v.wins / v.total) * 100;
        if (vWinRate < 25) {
          weaknesses.push({
            type: "variation_weak",
            opening: `${fam.name}: ${v.name}`,
            winRate: Math.round(vWinRate),
            total: v.total,
            message: `${Math.round(vWinRate)}% win rate nesta variação específica`,
          });
        }
      }
    }
  }

  return weaknesses.sort((a, b) => a.winRate - b.winRate).slice(0, 6);
}

// ── Win/Draw/Loss bar ───────────────────────────────────────────
function WDLBar({ wins, draws, losses, total, height = 6 }) {
  if (total === 0) return null;
  const wP = (wins / total) * 100;
  const dP = (draws / total) * 100;
  const lP = (losses / total) * 100;
  return (
    <div style={{ display: "flex", height, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
      <div style={{ width: `${wP}%`, background: "#7fa650", transition: "width 0.4s" }} />
      <div style={{ width: `${dP}%`, background: "#c4a74a", transition: "width 0.4s" }} />
      <div style={{ width: `${lP}%`, background: "#e85d5d", transition: "width 0.4s" }} />
    </div>
  );
}

// ── Badge de plataforma ─────────────────────────────────────────
function PlatformBadge({ platforms }) {
  if (platforms.size <= 1) return null;
  return (
    <span style={{
      fontSize: 9, padding: "2px 7px", borderRadius: 4,
      background: "rgba(196,167,74,0.12)", color: "#c4a74a",
      fontWeight: 600, letterSpacing: 0.5, marginLeft: 6,
      verticalAlign: "middle",
    }}>CROSS</span>
  );
}

// ── Variation row (dentro da árvore) ────────────────────────────
function VariationRow({ v, isSelected, onClick }) {
  const winRate = v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0;
  const wrColor = winRate >= 55 ? "#7fa650" : winRate >= 40 ? "#c4a74a" : "#e85d5d";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 8px 28px",
        background: isSelected ? "rgba(196,167,74,0.08)" : "transparent",
        borderLeft: "2px solid rgba(255,255,255,0.04)",
        marginLeft: 12, cursor: "pointer", borderRadius: "0 6px 6px 0",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? "rgba(196,167,74,0.08)" : "transparent"; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {v.name}
          <PlatformBadge platforms={v.platforms} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0, textAlign: "right", minWidth: 40 }}>
        {v.total}
      </div>
      <div style={{ width: 80, flexShrink: 0 }}>
        <WDLBar wins={v.wins} draws={v.draws} losses={v.losses} total={v.total} height={4} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: wrColor, minWidth: 36, textAlign: "right", flexShrink: 0 }}>
        {winRate}%
      </div>
    </div>
  );
}

// ── Opening family row ──────────────────────────────────────────
function OpeningRow({ fam, isExpanded, onToggle, selectedVariation, onSelectVariation }) {
  const winRate = fam.total > 0 ? Math.round((fam.wins / fam.total) * 100) : 0;
  const wrColor = winRate >= 55 ? "#7fa650" : winRate >= 40 ? "#c4a74a" : "#e85d5d";
  const variations = Object.values(fam.variations).sort((a, b) => b.total - a.total);
  const hasVariations = variations.length > 1 || (variations.length === 1 && variations[0].name !== "Linha principal");

  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: isExpanded ? "rgba(255,255,255,0.04)" : "transparent",
          borderRadius: 8, cursor: "pointer", transition: "background 0.15s",
        }}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = isExpanded ? "rgba(255,255,255,0.04)" : "transparent"; }}
      >
        {/* Expand arrow */}
        <span style={{
          fontSize: 10, color: "rgba(255,255,255,0.25)", transition: "transform 0.2s",
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
          width: 14, textAlign: "center", flexShrink: 0,
        }}>
          {hasVariations ? "▶" : "●"}
        </span>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, color: "#fff", fontWeight: 500,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {fam.name}
            <PlatformBadge platforms={fam.platforms} />
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
            {hasVariations ? `${variations.length} variações` : ""} · {fam.total} partida{fam.total !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Color split mini */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
          <span title="Como brancas">♔ {fam.asWhite.w + fam.asWhite.l + fam.asWhite.d}</span>
          <span title="Como pretas">♚ {fam.asBlack.w + fam.asBlack.l + fam.asBlack.d}</span>
        </div>

        {/* WDL bar */}
        <div style={{ width: 90, flexShrink: 0 }}>
          <WDLBar wins={fam.wins} draws={fam.draws} losses={fam.losses} total={fam.total} />
        </div>

        {/* Win rate */}
        <div style={{
          fontSize: 14, fontWeight: 700, color: wrColor,
          minWidth: 42, textAlign: "right", flexShrink: 0,
        }}>
          {winRate}%
        </div>
      </div>

      {/* Expanded variations */}
      {isExpanded && hasVariations && (
        <div style={{ paddingBottom: 6 }}>
          {variations.map(v => (
            <VariationRow
              key={v.name}
              v={v}
              isSelected={selectedVariation === v.name}
              onClick={(e) => { e.stopPropagation(); onSelectVariation(v.name); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Weakness Alert ──────────────────────────────────────────────
function WeaknessCard({ weaknesses }) {
  if (!weaknesses.length) return null;

  const typeIcons = {
    low_winrate: "📉",
    color_imbalance: "⚖️",
    cross_platform: "🔄",
    variation_weak: "🎯",
  };

  return (
    <div style={{
      background: "rgba(232,93,93,0.04)", border: "1px solid rgba(232,93,93,0.1)",
      borderRadius: 14, padding: "16px 18px", marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#e85d5d", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15 }}>⚠️</span> Pontos fracos detectados
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {weaknesses.map((w, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
            background: "rgba(0,0,0,0.15)", borderRadius: 8,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{typeIcons[w.type] || "⚠️"}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{w.opening}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{w.message}</div>
              {w.cross && <span style={{
                fontSize: 9, padding: "1px 5px", borderRadius: 3,
                background: "rgba(196,167,74,0.12)", color: "#c4a74a",
                fontWeight: 600, marginTop: 4, display: "inline-block",
              }}>Ambas plataformas</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Performance Chart (horizontal bars, Canvas) ─────────────────
function PerformanceChart({ tree }) {
  const canvasRef = useRef(null);
  const top = tree.slice(0, 10);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || top.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const barH = 28;
    const gap = 6;
    const labelW = 160;
    const statsW = 50;
    const h = top.length * (barH + gap) + 10;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const barArea = w - labelW - statsW - 20;

    top.forEach((fam, i) => {
      const y = i * (barH + gap) + 4;
      const winRate = fam.total > 0 ? Math.round((fam.wins / fam.total) * 100) : 0;

      // Label (truncated)
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      let label = fam.name;
      while (ctx.measureText(label).width > labelW - 10 && label.length > 3) {
        label = label.slice(0, -4) + "...";
      }
      ctx.fillText(label, labelW - 6, y + barH / 2);

      // Stacked bar
      const bx = labelW;
      const wW = (fam.wins / fam.total) * barArea;
      const dW = (fam.draws / fam.total) * barArea;
      const lW = (fam.losses / fam.total) * barArea;

      // Wins
      ctx.fillStyle = "#7fa650";
      roundedRect(ctx, bx, y + 2, wW, barH - 4, 3, true, false);
      // Draws
      ctx.fillStyle = "#c4a74a";
      ctx.fillRect(bx + wW, y + 2, dW, barH - 4);
      // Losses
      ctx.fillStyle = "#e85d5d";
      roundedRect(ctx, bx + wW + dW, y + 2, lW, barH - 4, 3, false, true);

      // Win rate text
      ctx.fillStyle = winRate >= 55 ? "#7fa650" : winRate >= 40 ? "#c4a74a" : "#e85d5d";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${winRate}%`, w - statsW + 4, y + barH / 2);

      // Game count
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${fam.total}`, w - 14, y + barH / 2);
    });
  }, [top]);

  if (top.length === 0) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, padding: "16px 18px", marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
        📊 Performance por abertura
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div style={{ display: "flex", gap: 14, marginTop: 10, justifyContent: "center" }}>
        {[
          { label: "Vitória", color: "#7fa650" },
          { label: "Empate", color: "#c4a74a" },
          { label: "Derrota", color: "#e85d5d" },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function roundedRect(ctx, x, y, w, h, r, roundLeft, roundRight) {
  if (w <= 0) return;
  ctx.beginPath();
  const rl = roundLeft ? r : 0;
  const rr = roundRight ? r : 0;
  ctx.moveTo(x + rl, y);
  ctx.lineTo(x + w - rr, y);
  if (roundRight) ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - rr);
  if (roundRight) ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + rl, y + h);
  if (roundLeft) ctx.quadraticCurveTo(x, y + h, x, y + h - rl);
  else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + rl);
  if (roundLeft) ctx.quadraticCurveTo(x, y, x + rl, y);
  else ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

// ── Detail panel (quando seleciona uma variação) ────────────────
function VariationDetail({ fam, variationName }) {
  const v = fam.variations[variationName];
  if (!v) return null;

  const winRate = v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0;
  const wTotal = v.asWhite.w + v.asWhite.l + v.asWhite.d;
  const bTotal = v.asBlack.w + v.asBlack.l + v.asBlack.d;
  const wWR = wTotal > 0 ? Math.round((v.asWhite.w / wTotal) * 100) : 0;
  const bWR = bTotal > 0 ? Math.round((v.asBlack.w / bTotal) * 100) : 0;

  return (
    <div style={{
      background: "rgba(196,167,74,0.04)", border: "1px solid rgba(196,167,74,0.1)",
      borderRadius: 12, padding: 16, marginTop: 12,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#c4a74a", marginBottom: 4 }}>
        {fam.name}: {v.name}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
        {v.total} partida{v.total !== 1 ? "s" : ""} · Win rate: {winRate}%
      </div>

      <WDLBar wins={v.wins} draws={v.draws} losses={v.losses} total={v.total} height={8} />

      <div style={{ display: "flex", justifyContent: "space-around", marginTop: 14, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#7fa650" }}>{v.wins}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Vitórias</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#c4a74a" }}>{v.draws}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Empates</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e85d5d" }}>{v.losses}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Derrotas</div>
        </div>
      </div>

      {/* Color breakdown */}
      {(wTotal > 0 || bTotal > 0) && (
        <div style={{
          display: "flex", gap: 12, marginTop: 14, paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>♔ Brancas ({wTotal})</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: wWR >= 50 ? "#7fa650" : "#e85d5d" }}>{wWR}%</div>
            <WDLBar wins={v.asWhite.w} draws={v.asWhite.d} losses={v.asWhite.l} total={wTotal} height={4} />
          </div>
          <div style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>♚ Pretas ({bTotal})</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: bWR >= 50 ? "#7fa650" : "#e85d5d" }}>{bWR}%</div>
            <WDLBar wins={v.asBlack.w} draws={v.asBlack.d} losses={v.asBlack.l} total={bTotal} height={4} />
          </div>
        </div>
      )}

      {/* Recent games in this variation */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Partidas recentes</div>
        {v.games.slice(0, 5).map((g, i) => {
          const rc = g.result === "win" ? "#7fa650" : g.result === "loss" ? "#e85d5d" : "#c4a74a";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: rc, flexShrink: 0 }} />
              <span style={{ color: "rgba(255,255,255,0.6)" }}>vs {g.opponent || "?"}</span>
              <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>{g.platform} · {g.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: OpeningExplorer
// ═══════════════════════════════════════════════════════════════════
export function OpeningExplorer({ games }) {
  const [expandedFamily, setExpandedFamily] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [view, setView] = useState("tree"); // "tree" | "chart" | "weaknesses"
  const [filterPlatform, setFilterPlatform] = useState("all");

  const filteredGames = useMemo(() => {
    if (filterPlatform === "all") return games;
    return games.filter(g => g.platform === (filterPlatform === "lichess" ? "Lichess" : "Chess.com"));
  }, [games, filterPlatform]);

  const tree = useMemo(() => buildOpeningTree(filteredGames), [filteredGames]);
  const weaknesses = useMemo(() => detectWeaknesses(tree), [tree]);

  const selectedFam = tree.find(f => f.name === expandedFamily);

  if (!games.length) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "20px 22px", marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
          ♟ Opening Explorer
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 400, marginLeft: 8 }}>
            {filteredGames.length} partidas · {tree.length} aberturas
          </span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {/* View tabs */}
          {[
            { k: "tree", l: "Árvore" },
            { k: "chart", l: "Gráfico" },
            { k: "weaknesses", l: `Fraquezas${weaknesses.length ? ` (${weaknesses.length})` : ""}` },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setView(k)} style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
              background: view === k ? "rgba(196,167,74,0.15)" : "transparent",
              color: view === k ? "#c4a74a" : "rgba(255,255,255,0.3)",
              fontWeight: view === k ? 600 : 400,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Platform filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[
          { k: "all", l: "Todas" },
          { k: "lichess", l: "Lichess" },
          { k: "chesscom", l: "Chess.com" },
        ].map(({ k, l }) => (
          <button key={k} onClick={() => setFilterPlatform(k)} style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer",
            background: filterPlatform === k ? "rgba(255,255,255,0.08)" : "transparent",
            color: filterPlatform === k ? "#fff" : "rgba(255,255,255,0.25)",
          }}>{l}</button>
        ))}
      </div>

      {/* Tree view */}
      {view === "tree" && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: 1, maxHeight: 500, overflowY: "auto" }}>
            {/* Column headers */}
            <div style={{
              display: "flex", padding: "0 14px 8px", fontSize: 10,
              color: "rgba(255,255,255,0.2)", borderBottom: "1px solid rgba(255,255,255,0.04)",
              marginBottom: 4,
            }}>
              <div style={{ flex: 1, paddingLeft: 24 }}>Abertura</div>
              <div style={{ width: 40, textAlign: "center" }}>♔/♚</div>
              <div style={{ width: 90, textAlign: "center" }}>W / D / L</div>
              <div style={{ width: 42, textAlign: "right" }}>Win%</div>
            </div>
            {tree.map(fam => (
              <OpeningRow
                key={fam.name}
                fam={fam}
                isExpanded={expandedFamily === fam.name}
                onToggle={() => {
                  setExpandedFamily(expandedFamily === fam.name ? null : fam.name);
                  setSelectedVariation(null);
                }}
                selectedVariation={expandedFamily === fam.name ? selectedVariation : null}
                onSelectVariation={(v) => setSelectedVariation(selectedVariation === v ? null : v)}
              />
            ))}
          </div>

          {/* Detail panel */}
          {selectedFam && selectedVariation && (
            <div style={{ width: 300, flexShrink: 0 }}>
              <VariationDetail fam={selectedFam} variationName={selectedVariation} />
            </div>
          )}
        </div>
      )}

      {/* Chart view */}
      {view === "chart" && <PerformanceChart tree={tree} />}

      {/* Weaknesses view */}
      {view === "weaknesses" && (
        weaknesses.length > 0 ? (
          <WeaknessCard weaknesses={weaknesses} />
        ) : (
          <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Nenhum ponto fraco significativo encontrado. Continue jogando para mais dados!
          </div>
        )
      )}
    </div>
  );
}
