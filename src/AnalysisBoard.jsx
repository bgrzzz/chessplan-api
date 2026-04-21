// ═══════════════════════════════════════════════════════════════════
// AnalysisBoard.jsx — Aba de análise com timeline de lances
// Coloque em src/AnalysisBoard.jsx
//
// Uso no App.jsx:
//   import { AnalysisBoard } from './AnalysisBoard'
//   <AnalysisBoard game={selectedGame} session={session} />
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "./supabaseClient";

// ── Reutiliza a lógica de xadrez do App ─────────────────────────
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const PIECE_SYMBOLS = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

function fenToBoard(fen) {
  const rows = fen.split(" ")[0].split("/");
  const board = [];
  for (const row of rows) {
    const r = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < parseInt(ch); i++) r.push(null);
      else r.push(ch);
    }
    board.push(r);
  }
  return board;
}

function boardToFenPart(board) {
  return board.map(row => {
    let s = "", empty = 0;
    for (const cell of row) {
      if (!cell) empty++;
      else { if (empty) { s += empty; empty = 0; } s += cell; }
    }
    if (empty) s += empty;
    return s;
  }).join("/");
}

function parseSquare(sq) {
  return [8 - parseInt(sq[1]), sq.charCodeAt(0) - 97];
}

function canReach(piece, sr, sc, dr, dc, board, isWhite, enPassant) {
  const dRow = dr - sr, dCol = dc - sc;
  switch (piece) {
    case "P": {
      const dir = isWhite ? -1 : 1;
      const startRow = isWhite ? 6 : 1;
      if (dCol === 0 && dRow === dir && !board[dr][dc]) return true;
      if (dCol === 0 && dRow === 2 * dir && sr === startRow && !board[sr + dir][sc] && !board[dr][dc]) return true;
      if (Math.abs(dCol) === 1 && dRow === dir) {
        if (board[dr][dc]) return true;
        if (enPassant !== "-") { const [epR, epC] = parseSquare(enPassant); if (dr === epR && dc === epC) return true; }
      }
      return false;
    }
    case "N": return (Math.abs(dRow) === 2 && Math.abs(dCol) === 1) || (Math.abs(dRow) === 1 && Math.abs(dCol) === 2);
    case "B": return Math.abs(dRow) === Math.abs(dCol) && pathClear(sr, sc, dr, dc, board);
    case "R": return (dRow === 0 || dCol === 0) && pathClear(sr, sc, dr, dc, board);
    case "Q": return (dRow === 0 || dCol === 0 || Math.abs(dRow) === Math.abs(dCol)) && pathClear(sr, sc, dr, dc, board);
    case "K": return Math.abs(dRow) <= 1 && Math.abs(dCol) <= 1;
    default: return false;
  }
}

function pathClear(sr, sc, dr, dc, board) {
  const stepR = Math.sign(dr - sr), stepC = Math.sign(dc - sc);
  let r = sr + stepR, c = sc + stepC;
  while (r !== dr || c !== dc) { if (board[r][c]) return false; r += stepR; c += stepC; }
  return true;
}

function applyMoveToFen(fen, san) {
  const parts = fen.split(" ");
  let board = fenToBoard(fen);
  const isWhite = parts[1] === "w";
  let castling = parts[2], enPassant = parts[3];
  let halfmove = parseInt(parts[4]) || 0, fullmove = parseInt(parts[5]) || 1;
  const cleanSan = san.replace(/[+#!?]/g, "").trim();
  if (!cleanSan) return fen;

  if (cleanSan === "O-O" || cleanSan === "O-O-O") {
    const row = isWhite ? 7 : 0;
    const ks = cleanSan === "O-O";
    board[row][4] = null;
    if (ks) { board[row][6] = isWhite ? "K" : "k"; board[row][7] = null; board[row][5] = isWhite ? "R" : "r"; }
    else { board[row][2] = isWhite ? "K" : "k"; board[row][0] = null; board[row][3] = isWhite ? "R" : "r"; }
    if (isWhite) castling = castling.replace(/[KQ]/g, ""); else castling = castling.replace(/[kq]/g, "");
    if (!castling) castling = "-";
    halfmove++; if (!isWhite) fullmove++;
    return `${boardToFenPart(board)} ${isWhite ? "b" : "w"} ${castling} - ${halfmove} ${fullmove}`;
  }

  let piece, fromHint = "", destStr, promotion = null, isCapture = false;
  let s = cleanSan;
  const promoMatch = s.match(/=?([QRBN])$/);
  if (promoMatch) { promotion = promoMatch[1]; s = s.replace(/=?[QRBN]$/, ""); }
  if (/^[KQRBN]/.test(s)) { piece = s[0]; s = s.slice(1); } else piece = "P";
  if (s.includes("x")) { isCapture = true; s = s.replace("x", ""); }
  destStr = s.slice(-2); fromHint = s.slice(0, -2);
  if (destStr.length !== 2 || !/[a-h][1-8]/.test(destStr)) return fen;
  const [destRow, destCol] = parseSquare(destStr);
  const targetPiece = isWhite ? piece : piece.toLowerCase();
  let srcRow = -1, srcCol = -1;

  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] !== targetPiece) continue;
    if (fromHint.length === 2) { const [hr, hc] = parseSquare(fromHint); if (r !== hr || c !== hc) continue; }
    else if (fromHint.length === 1) {
      if (/[a-h]/.test(fromHint)) { if (c !== fromHint.charCodeAt(0) - 97) continue; }
      else if (/[1-8]/.test(fromHint)) { if (r !== 8 - parseInt(fromHint)) continue; }
    }
    if (canReach(piece, r, c, destRow, destCol, board, isWhite, enPassant)) { srcRow = r; srcCol = c; }
  }
  if (srcRow === -1) return fen;

  let newEnPassant = "-";
  if (piece === "P") {
    if (destCol !== srcCol && !board[destRow][destCol]) board[srcRow][destCol] = null;
    if (Math.abs(destRow - srcRow) === 2) newEnPassant = String.fromCharCode(97 + destCol) + (8 - (isWhite ? destRow + 1 : destRow - 1));
    halfmove = 0;
  } else halfmove = isCapture ? 0 : halfmove + 1;
  if (isCapture) halfmove = 0;
  board[srcRow][srcCol] = null;
  board[destRow][destCol] = promotion ? (isWhite ? promotion : promotion.toLowerCase()) : targetPiece;
  if (piece === "K") { if (isWhite) castling = castling.replace(/[KQ]/g, ""); else castling = castling.replace(/[kq]/g, ""); }
  if (!castling) castling = "-";
  if (!isWhite) fullmove++;
  return `${boardToFenPart(board)} ${isWhite ? "b" : "w"} ${castling} ${newEnPassant} ${halfmove} ${fullmove}`;
}

function generateFenHistory(moves) {
  const fens = [INITIAL_FEN];
  let fen = INITIAL_FEN;
  for (const m of moves) { fen = applyMoveToFen(fen, m); fens.push(fen); }
  return fens;
}

// ── Gera game_key único para salvar anotações ───────────────────
function makeGameKey(game) {
  if (game.id) return String(game.id).substring(0, 60);
  return `${game.platform}_${game.white}_${game.black}_${game.date}`.substring(0, 60);
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE: AnalysisBoard
// ═══════════════════════════════════════════════════════════════════
export function AnalysisBoard({ game, session, onBack }) {
  const [plyIndex, setPlyIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState({}); // { ply: "texto" }
  const [editingPly, setEditingPly] = useState(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(null);
  const boardRef = useRef(null);
  const timelineRef = useRef(null);
  const playRef = useRef(null);
  const inputRef = useRef(null);
  const [boardSize, setBoardSize] = useState(400);

  const [explorerData, setExplorerData] = useState(null);
  const [loadingExplorer, setLoadingExplorer] = useState(false);

  const moves = game?.moves || [];
  const fenHistory = useMemo(() => generateFenHistory(moves), [moves]);

  const currentFen = fenHistory[plyIndex] || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const board = useMemo(() => fenToBoard(fenHistory[plyIndex] || INITIAL_FEN), [fenHistory, plyIndex]);
  const gameKey = useMemo(() => game ? makeGameKey(game) : null, [game]);

  useEffect(() => {
    const fetchExplorer = async () => {
  setLoadingExplorer(true);
  try {
    const res = await fetch(
      `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(currentFen)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.warn("Lichess explorer:", res.status);
      setExplorerData(null);
      return;
    }

    const data = await res.json();
    setExplorerData(data);
  } catch (err) {
    console.error("Erro na conexão:", err);
    setExplorerData(null);
  } finally {
    setLoadingExplorer(false);
  }
};

    // Debounce de 1.5s para respeitar rate limit do Lichess
    const timer = setTimeout(fetchExplorer, 1500);
    return () => clearTimeout(timer);
  }, [currentFen]);

  // Responsivo
  useEffect(() => {
    const update = () => {
      if (boardRef.current) setBoardSize(Math.min(boardRef.current.offsetWidth, 520));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Reset ao trocar de partida
  useEffect(() => { setPlyIndex(0); setIsPlaying(false); setEditingPly(null); }, [game]);

  // Carregar anotações do Supabase
  useEffect(() => {
    if (!session || !gameKey) return;
    supabase
      .from("game_annotations")
      .select("ply, note")
      .eq("user_id", session.user.id)
      .eq("game_key", gameKey)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(row => { map[row.ply] = row.note; });
          setNotes(map);
        }
      });
  }, [session, gameKey]);

  // Autoplay
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setPlyIndex(prev => {
          if (prev >= fenHistory.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1000);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, fenHistory.length]);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (editingPly !== null) return; // Não navega se tiver escrevendo
      if (e.key === "ArrowLeft") { e.preventDefault(); setIsPlaying(false); setPlyIndex(i => Math.max(0, i - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setIsPlaying(false); setPlyIndex(i => Math.min(fenHistory.length - 1, i + 1)); }
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fenHistory.length, editingPly]);

  // Auto-scroll timeline
  useEffect(() => {
    if (timelineRef.current) {
      const active = timelineRef.current.querySelector("[data-active='true']");
      if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [plyIndex]);

  // Focus input quando abre edição
  useEffect(() => {
    if (editingPly !== null && inputRef.current) inputRef.current.focus();
  }, [editingPly]);

  // Salvar nota
  const saveNote = useCallback(async (ply, text) => {
    if (!session || !gameKey) return;
    setSaving(true);

    const trimmed = text.trim();
    if (trimmed === "") {
      // Delete
      await supabase.from("game_annotations").delete()
        .eq("user_id", session.user.id)
        .eq("game_key", gameKey)
        .eq("ply", ply);
      setNotes(prev => { const n = { ...prev }; delete n[ply]; return n; });
    } else {
      // Upsert
      await supabase.from("game_annotations").upsert({
        user_id: session.user.id,
        game_key: gameKey,
        ply,
        note: trimmed,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,game_key,ply" });
      setNotes(prev => ({ ...prev, [ply]: trimmed }));
    }

    setSaving(false);
    setSavedIndicator(ply);
    setTimeout(() => setSavedIndicator(null), 1500);
    setEditingPly(null);
  }, [session, gameKey]);

  // Detecta último lance highlights
  const lastMove = useMemo(() => {
    if (plyIndex === 0 || !moves[plyIndex - 1]) return null;
    const san = moves[plyIndex - 1].replace(/[+#!?]/g, "");
    if (san === "O-O" || san === "O-O-O") return null;
    const dest = san.match(/([a-h][1-8])/g);
    if (!dest) return null;
    return parseSquare(dest[dest.length - 1]);
  }, [plyIndex, moves]);

  const sq = boardSize / 8;
  const notesCount = Object.keys(notes).length;

  if (!game) return (
    <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
      Selecione uma partida para analisar
    </div>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
            {game.white || "?"} <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 6px" }}>vs</span> {game.black || "?"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            {game.opening && <span>{game.opening} · </span>}
            {game.platform} · {game.timeControl} · {game.date}
            {notesCount > 0 && <span style={{ marginLeft: 8, color: "#c4a74a" }}>{notesCount} nota{notesCount !== 1 ? "s" : ""}</span>}
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} style={{
            background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.1)", padding: "6px 14px",
            borderRadius: 8, cursor: "pointer", fontSize: 12,
          }}>← Voltar</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ═══ BOARD (60%) ═══ */}
        <div ref={boardRef} style={{ flex: 3, minWidth: 280, maxWidth: 520 }}>
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

          {/* Controles */}
          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
            {[
              { label: "⏮", action: () => { setIsPlaying(false); setPlyIndex(0); } },
              { label: "◀", action: () => { setIsPlaying(false); setPlyIndex(i => Math.max(0, i - 1)); } },
              { label: isPlaying ? "⏸" : "▶", action: () => setIsPlaying(p => !p), active: isPlaying },
              { label: "▶", action: () => { setIsPlaying(false); setPlyIndex(i => Math.min(fenHistory.length - 1, i + 1)); } },
              { label: "⏭", action: () => { setIsPlaying(false); setPlyIndex(fenHistory.length - 1); } },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} style={{
                width: 38, height: 32, borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.12)",
                background: btn.active ? "rgba(196,167,74,0.2)" : "rgba(255,255,255,0.05)",
                color: "#fff", fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{btn.label}</button>
            ))}
          </div>

          {/* Barra de progresso */}
          <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 8 }}>
            <div style={{
              height: "100%", width: `${moves.length ? (plyIndex / moves.length) * 100 : 0}%`,
              background: "linear-gradient(90deg, #8b7355, #c4a74a)", borderRadius: 2, transition: "width 0.2s",
            }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
            {plyIndex === 0 ? "Posição inicial" : `Lance ${plyIndex} de ${moves.length}`}
          </div>
        </div>

        <div style={{
          flex: "1 1 250px", minHeight: 400,
          background: "rgba(255,255,255,0.02)", borderRadius: 12,
          border: "1px solid rgba(196,167,74,0.15)", padding: 16,
        }}>
          <h3 style={{ fontSize: 14, color: "#c4a74a", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            🎓 Explorer de Mestres
          </h3>
          
          {loadingExplorer ? (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Consultando base de dados...</div>
          ) : explorerData?.moves?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {explorerData.moves.slice(0, 8).map((m) => {
                const total = m.white + m.draws + m.black;
                return (
                  <div key={m.san} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{m.san}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{total} partidas</span>
                    </div>
                    {/* Barra de Probabilidade */}
                    <div style={{ display: "flex", height: 5, borderRadius: 2, overflow: "hidden", background: "#333" }}>
                      <div style={{ flex: m.white, background: "#fff" }} />
                      <div style={{ flex: m.draws, background: "#888" }} />
                      <div style={{ flex: m.black, background: "#000", border: "0.1px solid #444" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginTop: 3, opacity: 0.6 }}>
                       <span>W: {Math.round(m.white/total*100)}%</span>
                       <span>D: {Math.round(m.draws/total*100)}%</span>
                       <span>B: {Math.round(m.black/total*100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Fora da teoria de mestres ou posição final.</div>
          )}

          {explorerData?.topGames?.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 15, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Principais Partidas</span>
              {explorerData.topGames.slice(0, 2).map(g => (
                <div key={g.id} style={{ fontSize: 11, marginTop: 8, color: "rgba(255,255,255,0.7)" }}>
                  <div>{g.white.name} vs {g.black.name}</div>
                  <div style={{ fontSize: 9, opacity: 0.5 }}>{g.year} · {g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "½-½"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ TIMELINE DE LANCES (40%) ═══ */}
        <div style={{
          flex: 2, minWidth: 260, maxHeight: "70vh", overflowY: "auto",
          background: "rgba(255,255,255,0.02)", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)", padding: "12px 0",
        }} ref={timelineRef}>

          {/* Posição inicial */}
          <div
            data-active={plyIndex === 0}
            onClick={() => { setIsPlaying(false); setPlyIndex(0); }}
            style={{
              padding: "10px 16px", cursor: "pointer",
              background: plyIndex === 0 ? "rgba(196,167,74,0.08)" : "transparent",
              borderLeft: plyIndex === 0 ? "3px solid #c4a74a" : "3px solid transparent",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Posição inicial</span>
          </div>

          {/* Lances */}
          {moves.map((move, i) => {
            const ply = i + 1;
            const isWhiteMove = i % 2 === 0;
            const moveNum = Math.floor(i / 2) + 1;
            const isActive = plyIndex === ply;
            const hasNote = notes[ply];
            const isSaved = savedIndicator === ply;
            const isCapture = move.includes("x");
            const isCheck = move.includes("+") || move.includes("#");

            return (
              <div key={ply}>
                <div
                  data-active={isActive}
                  onClick={() => { setIsPlaying(false); setPlyIndex(ply); }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 16px", cursor: "pointer",
                    background: isActive ? "rgba(196,167,74,0.08)" : "transparent",
                    borderLeft: isActive ? "3px solid #c4a74a" : hasNote ? "3px solid rgba(196,167,74,0.2)" : "3px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive ? "rgba(196,167,74,0.08)" : "transparent"; }}
                >
                  {/* Número do lance + indicador de cor */}
                  <div style={{ minWidth: 36, textAlign: "right", flexShrink: 0 }}>
                    {isWhiteMove && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                        {moveNum}.
                      </span>
                    )}
                  </div>

                  {/* Dot da timeline */}
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%", marginTop: 4, flexShrink: 0,
                    background: isActive ? "#c4a74a" :
                      isCapture ? "rgba(232,93,93,0.5)" :
                      isCheck ? "rgba(196,167,74,0.5)" :
                      "rgba(255,255,255,0.1)",
                    border: isActive ? "2px solid #c4a74a" : "2px solid rgba(255,255,255,0.06)",
                    transition: "all 0.15s",
                  }} />

                  {/* Lance + nota */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 14, fontFamily: "monospace", fontWeight: isActive ? 700 : 400,
                        color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                      }}>
                        {isWhiteMove ? "♔" : "♚"} {move}
                      </span>
                      {isCapture && <span style={{ fontSize: 9, color: "#e85d5d" }}>captura</span>}
                      {isCheck && <span style={{ fontSize: 9, color: "#c4a74a" }}>xeque</span>}
                    </div>

                    {/* Nota existente ou botão de adicionar */}
                    {editingPly === ply ? (
                      <div style={{ marginTop: 6 }}>
                        <textarea
                          ref={inputRef}
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(ply, editText); }
                            if (e.key === "Escape") setEditingPly(null);
                          }}
                          placeholder="Sua anotação sobre este lance... (Enter salva, Esc cancela)"
                          style={{
                            width: "100%", minHeight: 60, padding: "8px 10px", borderRadius: 8,
                            border: "1px solid rgba(196,167,74,0.3)", background: "rgba(0,0,0,0.3)",
                            color: "#fff", fontSize: 12, resize: "vertical", fontFamily: "inherit",
                            outline: "none",
                          }}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          <button onClick={() => saveNote(ply, editText)} disabled={saving} style={{
                            fontSize: 11, padding: "4px 12px", borderRadius: 5, border: "none",
                            background: "#c4a74a", color: "#000", fontWeight: 600, cursor: "pointer",
                          }}>{saving ? "..." : "Salvar"}</button>
                          <button onClick={() => setEditingPly(null)} style={{
                            fontSize: 11, padding: "4px 10px", borderRadius: 5,
                            border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                            color: "rgba(255,255,255,0.4)", cursor: "pointer",
                          }}>Cancelar</button>
                          {notes[ply] && (
                            <button onClick={() => saveNote(ply, "")} style={{
                              fontSize: 11, padding: "4px 10px", borderRadius: 5,
                              border: "1px solid rgba(232,93,93,0.2)", background: "transparent",
                              color: "#e85d5d", cursor: "pointer", marginLeft: "auto",
                            }}>Apagar</button>
                          )}
                        </div>
                      </div>
                    ) : hasNote ? (
                      <div
                        onClick={(e) => { e.stopPropagation(); setEditingPly(ply); setEditText(notes[ply]); }}
                        style={{
                          marginTop: 4, padding: "6px 10px", borderRadius: 6,
                          background: "rgba(196,167,74,0.06)", border: "1px solid rgba(196,167,74,0.1)",
                          fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5,
                          cursor: "pointer", whiteSpace: "pre-wrap",
                        }}
                      >
                        {notes[ply]}
                        {isSaved && <span style={{ marginLeft: 6, color: "#7fa650", fontSize: 10 }}>salvo</span>}
                      </div>
                    ) : isActive ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingPly(ply); setEditText(""); }}
                        style={{
                          marginTop: 4, fontSize: 11, color: "rgba(196,167,74,0.5)",
                          background: "none", border: "none", cursor: "pointer",
                          padding: 0,
                        }}
                      >+ Adicionar nota</button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Resultado final */}
          <div style={{
            padding: "12px 16px", marginTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            textAlign: "center",
          }}>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: game.result === "win" ? "#7fa650" : game.result === "loss" ? "#e85d5d" : "#c4a74a",
            }}>
              {game.result === "win" ? "Vitória" : game.result === "loss" ? "Derrota" : "Empate"}
              {game.resultText && <span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400 }}> · {game.resultText}</span>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}