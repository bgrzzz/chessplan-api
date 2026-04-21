// ═══════════════════════════════════════════════════════════════════
// CourseView.jsx — Tela de estudo do curso
// Coloque em src/CourseView.jsx
//
// Uso no App.jsx:
//   import { CourseView } from './CourseView'
//   <CourseView courseId={selectedCourseId} session={session} onBack={() => ...} />
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "./supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Chess logic (same as App.jsx) ───────────────────────────────
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const PIECE_SYMBOLS = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

function fenToBoard(fen) {
  const rows = fen.split(" ")[0].split("/");
  return rows.map(row => {
    const r = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < parseInt(ch); i++) r.push(null);
      else r.push(ch);
    }
    return r;
  });
}
function boardToFenPart(board) {
  return board.map(row => {
    let s = "", e = 0;
    for (const c of row) { if (!c) e++; else { if (e) { s += e; e = 0; } s += c; } }
    if (e) s += e; return s;
  }).join("/");
}
function parseSquare(sq) { return [8 - parseInt(sq[1]), sq.charCodeAt(0) - 97]; }
function pathClear(sr, sc, dr, dc, board) {
  const rS = Math.sign(dr - sr), cS = Math.sign(dc - sc);
  let r = sr + rS, c = sc + cS;
  while (r !== dr || c !== dc) { if (board[r][c]) return false; r += rS; c += cS; }
  return true;
}
function canReach(piece, sr, sc, dr, dc, board, isWhite, ep) {
  const dR = dr - sr, dC = dc - sc;
  switch (piece) {
    case "P": { const dir = isWhite ? -1 : 1; const start = isWhite ? 6 : 1;
      if (dC === 0 && dR === dir && !board[dr][dc]) return true;
      if (dC === 0 && dR === 2 * dir && sr === start && !board[sr + dir][sc] && !board[dr][dc]) return true;
      if (Math.abs(dC) === 1 && dR === dir) { if (board[dr][dc]) return true; if (ep !== "-") { const [eR, eC] = parseSquare(ep); if (dr === eR && dc === eC) return true; } } return false; }
    case "N": return (Math.abs(dR) === 2 && Math.abs(dC) === 1) || (Math.abs(dR) === 1 && Math.abs(dC) === 2);
    case "B": return Math.abs(dR) === Math.abs(dC) && pathClear(sr, sc, dr, dc, board);
    case "R": return (dR === 0 || dC === 0) && pathClear(sr, sc, dr, dc, board);
    case "Q": return (dR === 0 || dC === 0 || Math.abs(dR) === Math.abs(dC)) && pathClear(sr, sc, dr, dc, board);
    case "K": return Math.abs(dR) <= 1 && Math.abs(dC) <= 1;
    default: return false;
  }
}
function applyMoveToFen(fen, san) {
  const parts = fen.split(" "); let board = fenToBoard(fen);
  const isW = parts[1] === "w"; let cast = parts[2], ep = parts[3], hm = parseInt(parts[4]) || 0, fm = parseInt(parts[5]) || 1;
  const clean = san.replace(/[+#!?]/g, "").trim(); if (!clean) return fen;
  if (clean === "O-O" || clean === "O-O-O") {
    const row = isW ? 7 : 0; const ks = clean === "O-O"; board[row][4] = null;
    if (ks) { board[row][6] = isW ? "K" : "k"; board[row][7] = null; board[row][5] = isW ? "R" : "r"; }
    else { board[row][2] = isW ? "K" : "k"; board[row][0] = null; board[row][3] = isW ? "R" : "r"; }
    if (isW) cast = cast.replace(/[KQ]/g, ""); else cast = cast.replace(/[kq]/g, "");
    if (!cast) cast = "-"; hm++; if (!isW) fm++;
    return `${boardToFenPart(board)} ${isW ? "b" : "w"} ${cast} - ${hm} ${fm}`;
  }
  let piece, hint = "", dest, promo = null, cap = false; let s = clean;
  const pm = s.match(/=?([QRBN])$/); if (pm) { promo = pm[1]; s = s.replace(/=?[QRBN]$/, ""); }
  if (/^[KQRBN]/.test(s)) { piece = s[0]; s = s.slice(1); } else piece = "P";
  if (s.includes("x")) { cap = true; s = s.replace("x", ""); }
  dest = s.slice(-2); hint = s.slice(0, -2);
  if (dest.length !== 2 || !/[a-h][1-8]/.test(dest)) return fen;
  const [dR, dC] = parseSquare(dest); const tp = isW ? piece : piece.toLowerCase();
  let sR = -1, sC = -1;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] !== tp) continue;
    if (hint.length === 2) { const [hr, hc] = parseSquare(hint); if (r !== hr || c !== hc) continue; }
    else if (hint.length === 1) { if (/[a-h]/.test(hint)) { if (c !== hint.charCodeAt(0) - 97) continue; } else if (/[1-8]/.test(hint)) { if (r !== 8 - parseInt(hint)) continue; } }
    if (canReach(piece, r, c, dR, dC, board, isW, ep)) { sR = r; sC = c; }
  }
  if (sR === -1) return fen;
  let nep = "-";
  if (piece === "P") { if (dC !== sC && !board[dR][dC]) board[sR][dC] = null; if (Math.abs(dR - sR) === 2) nep = String.fromCharCode(97 + dC) + (8 - (isW ? dR + 1 : dR - 1)); hm = 0; } else hm = cap ? 0 : hm + 1;
  if (cap) hm = 0; board[sR][sC] = null; board[dR][dC] = promo ? (isW ? promo : promo.toLowerCase()) : tp;
  if (piece === "K") { if (isW) cast = cast.replace(/[KQ]/g, ""); else cast = cast.replace(/[kq]/g, ""); }
  if (!cast) cast = "-"; if (!isW) fm++;
  return `${boardToFenPart(board)} ${isW ? "b" : "w"} ${cast} ${nep} ${hm} ${fm}`;
}

// ── Parse PGN with comments ─────────────────────────────────────
function parsePgnWithComments(pgn) {
  if (!pgn) return [];
  const result = [];
  let i = 0;
  while (i < pgn.length) {
    // Skip whitespace
    while (i < pgn.length && /\s/.test(pgn[i])) i++;
    if (i >= pgn.length) break;

    // Comment
    if (pgn[i] === "{") {
      const end = pgn.indexOf("}", i);
      if (end === -1) break;
      const comment = pgn.substring(i + 1, end).trim();
      if (result.length > 0) {
        result[result.length - 1].comment = comment;
      } else {
        result.push({ move: null, comment });
      }
      i = end + 1;
      continue;
    }

    // Move number (skip)
    if (/\d/.test(pgn[i])) {
      while (i < pgn.length && /[\d.\s]/.test(pgn[i])) i++;
      continue;
    }

    // Result marker
    if (pgn[i] === "*" || pgn.substring(i, i + 3) === "1-0" || pgn.substring(i, i + 3) === "0-1" || pgn.substring(i, i + 7) === "1/2-1/2") {
      break;
    }

    // Move
    let moveEnd = i;
    while (moveEnd < pgn.length && !/[\s{]/.test(pgn[moveEnd])) moveEnd++;
    const move = pgn.substring(i, moveEnd).trim();
    if (move && move !== "*") {
      result.push({ move, comment: null });
    }
    i = moveEnd;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE: CourseView
// ═══════════════════════════════════════════════════════════════════
export function CourseView({ courseId, session, onBack }) {
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [plyIndex, setPlyIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef(null);
  const boardRef = useRef(null);
  const timelineRef = useRef(null);
  const [boardSize, setBoardSize] = useState(400);
  const [completing, setCompleting] = useState(false);

  // Fetch course data
  useEffect(() => {
    setLoading(true);
    const headers = {};
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

    fetch(`${API_BASE}/courses/${courseId}`, { headers })
      .then(r => r.json())
      .then(data => {
        setCourse(data.course);
        setModules(data.modules || []);
        setHasAccess(data.has_access);
        setCompletedCount(data.completed_count || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [courseId, session]);

  // Responsive board
  useEffect(() => {
    const update = () => {
      if (boardRef.current) setBoardSize(Math.min(boardRef.current.offsetWidth, 480));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Active module
  const activeModule = modules[activeModuleIdx] || null;

  // Parse PGN with comments for active module
  const parsedMoves = useMemo(() => {
    if (!activeModule?.pgn_data) return [];
    return parsePgnWithComments(activeModule.pgn_data);
  }, [activeModule]);

  // Only actual moves (not intro comments)
  const moves = useMemo(() => parsedMoves.filter(m => m.move).map(m => m.move), [parsedMoves]);

  // FEN history
  const fenHistory = useMemo(() => {
    const fens = [INITIAL_FEN];
    let fen = INITIAL_FEN;
    for (const m of moves) { fen = applyMoveToFen(fen, m); fens.push(fen); }
    return fens;
  }, [moves]);

  const board = useMemo(() => fenToBoard(fenHistory[plyIndex] || INITIAL_FEN), [fenHistory, plyIndex]);
  const sq = boardSize / 8;

  // Reset ply on module change
  useEffect(() => { setPlyIndex(0); setIsPlaying(false); }, [activeModuleIdx]);

  // Autoplay
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setPlyIndex(prev => {
          if (prev >= fenHistory.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1500); // Slower for learning
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, fenHistory.length]);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); setIsPlaying(false); setPlyIndex(i => Math.max(0, i - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setIsPlaying(false); setPlyIndex(i => Math.min(fenHistory.length - 1, i + 1)); }
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fenHistory.length]);

  // Auto-scroll timeline
  useEffect(() => {
    if (timelineRef.current) {
      const active = timelineRef.current.querySelector("[data-active='true']");
      if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [plyIndex]);

  // Last move highlight
  const lastMove = useMemo(() => {
    if (plyIndex === 0 || !moves[plyIndex - 1]) return null;
    const san = moves[plyIndex - 1].replace(/[+#!?]/g, "");
    if (san === "O-O" || san === "O-O-O") return null;
    const dest = san.match(/([a-h][1-8])/g);
    if (!dest) return null;
    return parseSquare(dest[dest.length - 1]);
  }, [plyIndex, moves]);

  // Get comment for current ply
  const currentComment = useMemo(() => {
    if (plyIndex === 0) {
      const intro = parsedMoves.find(m => !m.move && m.comment);
      return intro?.comment || null;
    }
    let moveCount = 0;
    for (const pm of parsedMoves) {
      if (pm.move) {
        moveCount++;
        if (moveCount === plyIndex) return pm.comment;
      }
    }
    return null;
  }, [plyIndex, parsedMoves]);

  // Complete module
  const completeModule = useCallback(async () => {
    if (!session || !activeModule) return;
    setCompleting(true);
    try {
      await fetch(`${API_BASE}/courses/${courseId}/modules/${activeModule.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ quiz_score: 100 }),
      });
      // Update local state
      setModules(prev => prev.map(m =>
        m.id === activeModule.id ? { ...m, completed: true } : m
      ));
      setCompletedCount(c => c + 1);
    } catch {}
    setCompleting(false);
  }, [session, courseId, activeModule]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Carregando curso...</div>;
  if (!course) return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Curso não encontrado</div>;

  const totalModules = modules.length;
  const progressPct = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{course.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            {completedCount}/{totalModules} módulos · {progressPct}% completo
          </div>
        </div>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(255,255,255,0.1)", padding: "6px 14px",
          borderRadius: 8, cursor: "pointer", fontSize: 12,
        }}>← Voltar</button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {modules.map((m, idx) => (
          <div
            key={m.id}
            onClick={() => !m.locked && setActiveModuleIdx(idx)}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, cursor: m.locked ? "not-allowed" : "pointer",
              background: idx === activeModuleIdx ? "#c4a74a" :
                          m.completed ? "rgba(127,166,80,0.2)" :
                          m.locked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
              color: idx === activeModuleIdx ? "#000" :
                     m.completed ? "#7fa650" :
                     m.locked ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)",
              border: idx === activeModuleIdx ? "2px solid #c4a74a" :
                      m.completed ? "2px solid rgba(127,166,80,0.3)" :
                      "2px solid rgba(255,255,255,0.06)",
              transition: "all 0.15s",
            }}
            title={m.locked ? "Compre o curso para acessar" : m.title}
          >
            {m.completed ? "✓" : m.locked ? "🔒" : idx}
          </div>
        ))}
      </div>

      {/* Module locked message */}
      {activeModule?.locked && (
        <div style={{
          padding: "32px 24px", textAlign: "center",
          background: "rgba(196,167,74,0.04)", borderRadius: 16,
          border: "1px solid rgba(196,167,74,0.1)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
            Módulo bloqueado
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
            Compre o curso para acessar "{activeModule.title}" e todos os outros módulos.
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            Os {course.free_preview_modules || 2} primeiros módulos são gratuitos para experimentar.
          </div>
        </div>
      )}

      {/* Module content */}
      {activeModule && !activeModule.locked && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* Board (60%) */}
          <div ref={boardRef} style={{ flex: 3, minWidth: 280, maxWidth: 480 }}>
            {/* Module title */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#c4a74a" }}>
                Módulo {activeModule.order_index}: {activeModule.title}
              </div>
              {activeModule.description && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                  {activeModule.description}
                </div>
              )}
            </div>

            {/* Board */}
            <div style={{
              display: "inline-grid",
              gridTemplateColumns: `repeat(8, ${sq}px)`,
              gridTemplateRows: `repeat(8, ${sq}px)`,
              borderRadius: 8, overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.08)",
            }}>
              {board.map((row, ri) => row.map((piece, ci) => {
                const isLight = (ri + ci) % 2 === 0;
                const isHL = lastMove && lastMove[0] === ri && lastMove[1] === ci;
                return (
                  <div key={`${ri}-${ci}`} style={{
                    width: sq, height: sq,
                    background: isHL ? (isLight ? "#f0e68c" : "#c8b445") : (isLight ? "#e8dcc8" : "#8b6b4a"),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: sq * 0.72, lineHeight: 1,
                    color: piece && piece === piece.toUpperCase() ? "#fff" : "#1a1a1a",
                    textShadow: piece && piece === piece.toUpperCase() ? "0 2px 4px rgba(0,0,0,0.5)" : "none",
                    userSelect: "none", position: "relative",
                  }}>
                    {piece ? PIECE_SYMBOLS[piece] : ""}
                    {ci === 0 && <span style={{ position: "absolute", top: 2, left: 3, fontSize: 8, fontWeight: 600, color: isLight ? "#8b6b4a" : "#e8dcc8", opacity: 0.4 }}>{8 - ri}</span>}
                    {ri === 7 && <span style={{ position: "absolute", bottom: 1, right: 3, fontSize: 8, fontWeight: 600, color: isLight ? "#8b6b4a" : "#e8dcc8", opacity: 0.4 }}>{String.fromCharCode(97 + ci)}</span>}
                  </div>
                );
              }))}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
              {[
                { l: "⏮", a: () => { setIsPlaying(false); setPlyIndex(0); } },
                { l: "◀", a: () => { setIsPlaying(false); setPlyIndex(i => Math.max(0, i - 1)); } },
                { l: isPlaying ? "⏸" : "▶", a: () => setIsPlaying(p => !p), active: isPlaying },
                { l: "▶", a: () => { setIsPlaying(false); setPlyIndex(i => Math.min(fenHistory.length - 1, i + 1)); } },
                { l: "⏭", a: () => { setIsPlaying(false); setPlyIndex(fenHistory.length - 1); } },
              ].map((btn, i) => (
                <button key={i} onClick={btn.a} style={{
                  width: 38, height: 32, borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: btn.active ? "rgba(196,167,74,0.2)" : "rgba(255,255,255,0.05)",
                  color: "#fff", fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{btn.l}</button>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 8 }}>
              <div style={{
                height: "100%", width: `${moves.length ? (plyIndex / moves.length) * 100 : 0}%`,
                background: "linear-gradient(90deg, #8b7355, #c4a74a)", borderRadius: 2, transition: "width 0.2s",
              }} />
            </div>
          </div>

          {/* Content sidebar (40%) */}
          <div style={{ flex: 2, minWidth: 260, display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Comment box */}
            <div style={{
              background: currentComment ? "rgba(196,167,74,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${currentComment ? "rgba(196,167,74,0.12)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 12, padding: "16px 18px", minHeight: 80,
              transition: "all 0.3s",
            }}>
              {currentComment ? (
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
                  {currentComment}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: 8 }}>
                  {plyIndex === 0 ? "Clique ▶ ou use as setas para iniciar a lição" : "Avance para ver a explicação do próximo lance"}
                </div>
              )}
            </div>

            {/* Move timeline */}
            <div ref={timelineRef} style={{
              maxHeight: "40vh", overflowY: "auto",
              background: "rgba(255,255,255,0.02)", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)", padding: "8px 0",
            }}>
              {/* Intro */}
              <div
                data-active={plyIndex === 0}
                onClick={() => { setIsPlaying(false); setPlyIndex(0); }}
                style={{
                  padding: "8px 14px", cursor: "pointer",
                  background: plyIndex === 0 ? "rgba(196,167,74,0.08)" : "transparent",
                  borderLeft: plyIndex === 0 ? "3px solid #c4a74a" : "3px solid transparent",
                }}
              >
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Posição inicial</span>
              </div>

              {moves.map((move, i) => {
                const ply = i + 1;
                const isW = i % 2 === 0;
                const num = Math.floor(i / 2) + 1;
                const isActive = plyIndex === ply;
                // Find if this move has a comment
                let moveIdx = 0;
                let hasComment = false;
                for (const pm of parsedMoves) {
                  if (pm.move) {
                    moveIdx++;
                    if (moveIdx === ply) { hasComment = !!pm.comment; break; }
                  }
                }

                return (
                  <div
                    key={ply}
                    data-active={isActive}
                    onClick={() => { setIsPlaying(false); setPlyIndex(ply); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 14px", cursor: "pointer",
                      background: isActive ? "rgba(196,167,74,0.08)" : "transparent",
                      borderLeft: isActive ? "3px solid #c4a74a" : hasComment ? "3px solid rgba(196,167,74,0.15)" : "3px solid transparent",
                      transition: "all 0.1s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? "rgba(196,167,74,0.08)" : "transparent"; }}
                  >
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", minWidth: 24, textAlign: "right" }}>
                      {isW ? `${num}.` : ""}
                    </span>
                    <span style={{
                      fontSize: 13, fontFamily: "monospace",
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                    }}>
                      {isW ? "♔" : "♚"} {move}
                    </span>
                    {hasComment && (
                      <span style={{ fontSize: 10, color: "#c4a74a", marginLeft: "auto" }}>💬</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Key concepts */}
            {activeModule.key_concepts && activeModule.key_concepts.length > 0 && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 6,
                padding: "10px 14px", background: "rgba(255,255,255,0.02)",
                borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)",
              }}>
                {activeModule.key_concepts.map((kc, i) => (
                  <span key={i} style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 4,
                    background: "rgba(196,167,74,0.08)", color: "rgba(196,167,74,0.6)",
                  }}>{kc}</span>
                ))}
              </div>
            )}

            {/* Complete button (at end of module) */}
            {plyIndex >= moves.length && moves.length > 0 && !activeModule.completed && session && (
              <button onClick={completeModule} disabled={completing} style={{
                width: "100%", padding: 12, borderRadius: 10, border: "none",
                background: completing ? "rgba(127,166,80,0.3)" : "#7fa650",
                color: completing ? "rgba(255,255,255,0.5)" : "#000",
                fontSize: 14, fontWeight: 700, cursor: completing ? "wait" : "pointer",
              }}>
                {completing ? "Salvando..." : "Concluir módulo ✓"}
              </button>
            )}

            {/* Already completed */}
            {activeModule.completed && (
              <div style={{
                textAlign: "center", padding: 10, borderRadius: 10,
                background: "rgba(127,166,80,0.08)", border: "1px solid rgba(127,166,80,0.15)",
                fontSize: 13, color: "#7fa650", fontWeight: 600,
              }}>✓ Módulo concluído</div>
            )}

            {/* Next module button */}
            {(activeModule.completed || (plyIndex >= moves.length && moves.length > 0)) && activeModuleIdx < modules.length - 1 && (
              <button onClick={() => {
                const nextIdx = activeModuleIdx + 1;
                if (!modules[nextIdx].locked) setActiveModuleIdx(nextIdx);
              }} style={{
                width: "100%", padding: 10, borderRadius: 8,
                border: "1px solid rgba(196,167,74,0.2)", background: "transparent",
                color: "#c4a74a", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                Próximo módulo →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
