import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from './supabaseClient'
import { AuthForm } from './AuthForm'
import { OpeningExplorer } from './OpeningExplorer'
import { PricingPage, UpgradeModal, PlanBadge } from './PricingPage'
import { BlunderHeatmap } from './BlunderHeatmap'
import {Rivalrytracker } from './Rivalrytracker'
import { AnalysisBoard } from './AnalysisBoard'
import { PuzzleArena } from './PuzzleArena'
import { CourseCatalog } from "./CourseCatalog";
import { CourseView } from "./CourseView";
import { LandingPage } from './LandingPage'
import { BlogPage, BlogPost } from './BlogSystem'
import ReactGA from "react-ga4";
import { Routes, Route, useNavigate, useLocation, Link, NavLink, Navigate } from 'react-router-dom';

// Logo abaixo dos seus imports
ReactGA.initialize("G-7NFGFGN00R");
ReactGA.send("pageview");
// ═══════════════════════════════════════════════════════════════════
// 1. CONSTANTES E LÓGICA DE XADREZ
// ═══════════════════════════════════════════════════════════════════


const TEXTOS_LEGAIS = {
  termos: `TERMOS DE USO - CHESSPLAN

1. ACEITAÇÃO: Ao acessar o ChessPlan, você concorda com estes termos e com a utilização de nossas ferramentas de análise e cursos.
2. USO DA CONTA: A conta é pessoal e intransferível. O compartilhamento de login pode resultar na suspensão do acesso sem direito a reembolso.
3. PROPRIEDADE INTELECTUAL: Todo o conteúdo dos cursos, algoritmos e design da plataforma são de propriedade exclusiva do ChessPlan. É proibida a reprodução ou distribuição sem autorização.
4. LIMITAÇÃO DE RESPONSABILIDADE: As ferramentas de análise por IA são auxiliares. O ChessPlan não se responsabiliza por variações técnicas de motores de análise externos ou decisões baseadas em sugestões da plataforma.`,

  privacidade: `POLÍTICA DE PRIVACIDADE - CHESSPLAN (LGPD)

1. COLETA DE DADOS: Coletamos apenas Nome e E-mail fornecidos via Login Social (Google/Supabase) para identificação do usuário e salvamento de progresso.
2. PAGAMENTOS: Seus dados de cartão de crédito são processados exclusivamente pelo STRIPE. O ChessPlan não armazena nem tem acesso aos seus dados financeiros sensíveis.
3. USO DE INFORMAÇÕES: Seus dados nunca serão vendidos ou compartilhados com terceiros. São usados apenas para suporte e melhoria da sua experiência na plataforma.
4. SEUS DIREITOS: De acordo com a LGPD, você pode solicitar a exclusão total da sua conta e dados a qualquer momento enviando um e-mail para contato.chessplan@gmail.com.`,

  reembolso: `POLÍTICA DE REEMBOLSO E CANCELAMENTO

1. DIREITO DE ARREPENDIMENTO: Em conformidade com o Artigo 49 do Código de Defesa do Consumidor, você tem até 7 (sete) dias corridos após a compra para solicitar o cancelamento e reembolso integral, sem necessidade de justificativa.
2. COMO SOLICITAR: Envie um e-mail para contato.chessplan@gmail.com com os dados da conta. O estorno será processado pelo Stripe e aparecerá na sua fatura conforme os prazos da sua operadora de cartão.
3. CANCELAMENTO DE ASSINATURA: Planos recorrentes podem ser cancelados a qualquer momento pelo painel do usuário. O acesso aos recursos Pro permanecerá ativo até o fim do período já pago.
4. SUPORTE: Dúvidas sobre cobranças devem ser enviadas diretamente para nosso e-mail de suporte.`
};

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const PIECE_SYMBOLS = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};
const LICHESS_API = "https://lichess.org/api";
const CHESSCOM_API = "https://api.chess.com/pub/player";

const btnLinkStyle = {
  background: "#c4a74a", border: "none", color: "#000",
  padding: "8px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer"
};
const btnCancelStyle = {
  background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
  padding: "8px 16px", borderRadius: 6, cursor: "pointer", color: "#ccc"
};
const btnSyncSmall = { background: "none", border: "none", cursor: "pointer", fontSize: 16 };
const btnEditSmall = { background: "none", border: "none", cursor: "pointer", fontSize: 16 };



export function parsePgnToMoves(pgn) {
  if (!pgn) return [];
  // Remove comentários { ... }, metadados [ ... ] e números de lances 1. 2.
  const cleanPgn = pgn
    .replace(/\{.*?\}/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\d+\./g, "")
    .trim();
  
  // Transforma em array e remove espaços vazios
  return cleanPgn.split(/\s+/).filter(move => move.length > 0);
}


function LegalPage({ type }) {
  const navigate = useNavigate();
  return (
    <div className="fade-in" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#c4a74a', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>
        ← Voltar para o Dashboard
      </button>
      <h2 style={{ textTransform: 'capitalize', color: '#c4a74a', marginBottom: '20px' }}>
        {type === "termos" ? "Termos de Uso" : type === "privacidade" ? "Política de Privacidade" : "Política de Reembolso"}
      </h2>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', opacity: 0.9, backgroundColor: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '12px', border: '1px solid rgba(196,167,74,0.1)' }}>
        {TEXTOS_LEGAIS[type]}
      </div>
    </div>
  );
}

function fenToBoard(fen) {
  const rows = fen.split(" ")[0].split("/");
  const board = [];
  for (const row of rows) {
    const r = [];
    for (const ch of row) {
      if (/\d/.test(ch)) { for (let i = 0; i < parseInt(ch); i++) r.push(null); }
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
  const col = sq.charCodeAt(0) - 97;
  const row = 8 - parseInt(sq[1]);
  return [row, col];
}

function applyMoveToFen(fen, san) {
  const parts = fen.split(" ");
  let board = fenToBoard(fen);
  const isWhite = parts[1] === "w";
  let castling = parts[2];
  let enPassant = parts[3];
  let halfmove = parseInt(parts[4]) || 0;
  let fullmove = parseInt(parts[5]) || 1;
  const cleanSan = san.replace(/[+#!?]/g, "").trim();
  if (!cleanSan) return fen;

  if (cleanSan === "O-O" || cleanSan === "O-O-O") {
    const row = isWhite ? 7 : 0;
    const isKingside = cleanSan === "O-O";
    board[row][4] = null;
    if (isKingside) {
      board[row][6] = isWhite ? "K" : "k";
      board[row][7] = null;
      board[row][5] = isWhite ? "R" : "r";
    } else {
      board[row][2] = isWhite ? "K" : "k";
      board[row][0] = null;
      board[row][3] = isWhite ? "R" : "r";
    }
    if (isWhite) castling = castling.replace(/[KQ]/g, "");
    else castling = castling.replace(/[kq]/g, "");
    if (!castling) castling = "-";
    enPassant = "-";
    halfmove++;
    if (!isWhite) fullmove++;
    return `${boardToFenPart(board)} ${isWhite ? "b" : "w"} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
  }

  let piece, fromHint = "", destStr, promotion = null, isCapture = false;
  let s = cleanSan;
  const promoMatch = s.match(/=?([QRBN])$/);
  if (promoMatch) { promotion = promoMatch[1]; s = s.replace(/=?[QRBN]$/, ""); }
  if (/^[KQRBN]/.test(s)) { piece = s[0]; s = s.slice(1); }
  else piece = "P";
  if (s.includes("x")) { isCapture = true; s = s.replace("x", ""); }
  destStr = s.slice(-2);
  fromHint = s.slice(0, -2);
  if (destStr.length !== 2 || !/[a-h][1-8]/.test(destStr)) return fen;
  const [destRow, destCol] = parseSquare(destStr);
  const targetPiece = isWhite ? piece : piece.toLowerCase();
  let srcRow = -1, srcCol = -1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] !== targetPiece) continue;
      if (fromHint.length === 2) {
        const [hr, hc] = parseSquare(fromHint);
        if (r !== hr || c !== hc) continue;
      } else if (fromHint.length === 1) {
        if (/[a-h]/.test(fromHint)) { if (c !== fromHint.charCodeAt(0) - 97) continue; }
        else if (/[1-8]/.test(fromHint)) { if (r !== 8 - parseInt(fromHint)) continue; }
      }
      if (canReach(piece, r, c, destRow, destCol, board, isWhite, enPassant)) {
        srcRow = r; srcCol = c;
      }
    }
  }
  if (srcRow === -1) return fen;

  let newEnPassant = "-";
  if (piece === "P") {
    if (destCol !== srcCol && !board[destRow][destCol]) board[srcRow][destCol] = null;
    if (Math.abs(destRow - srcRow) === 2) {
      const epRow = isWhite ? destRow + 1 : destRow - 1;
      newEnPassant = String.fromCharCode(97 + destCol) + (8 - epRow);
    }
    halfmove = 0;
  } else { halfmove = isCapture ? 0 : halfmove + 1; }
  if (isCapture) halfmove = 0;

  board[srcRow][srcCol] = null;
  board[destRow][destCol] = promotion ? (isWhite ? promotion : promotion.toLowerCase()) : targetPiece;

  if (piece === "K") {
    if (isWhite) castling = castling.replace(/[KQ]/g, "");
    else castling = castling.replace(/[kq]/g, "");
  }
  if (piece === "R") {
    if (srcRow === 7 && srcCol === 0) castling = castling.replace("Q", "");
    if (srcRow === 7 && srcCol === 7) castling = castling.replace("K", "");
    if (srcRow === 0 && srcCol === 0) castling = castling.replace("q", "");
    if (srcRow === 0 && srcCol === 7) castling = castling.replace("k", "");
  }
  if (destRow === 0 && destCol === 0) castling = castling.replace("q", "");
  if (destRow === 0 && destCol === 7) castling = castling.replace("k", "");
  if (destRow === 7 && destCol === 0) castling = castling.replace("Q", "");
  if (destRow === 7 && destCol === 7) castling = castling.replace("K", "");
  if (!castling) castling = "-";
  if (!isWhite) fullmove++;

  return `${boardToFenPart(board)} ${isWhite ? "b" : "w"} ${castling} ${newEnPassant} ${halfmove} ${fullmove}`;
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

function generateFenHistory(moves) {
  const fens = [INITIAL_FEN];
  let currentFen = INITIAL_FEN;
  for (const move of moves) { currentFen = applyMoveToFen(currentFen, move); fens.push(currentFen); }
  return fens;
}

function parsePGN(pgn) {
  if (!pgn) return { headers: {}, moves: [] };
  const headers = {};
  let m;
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  while ((m = headerRegex.exec(pgn)) !== null) headers[m[1]] = m[2];
  const moveText = pgn.replace(/\[.*?\]\s*/g, "").replace(/\{[^}]*\}/g, "").replace(/\([^)]*\)/g, "").trim();
  const moves = moveText.split(/\d+\.+\s*/).filter(Boolean).flatMap(s => s.trim().split(/\s+/))
    .filter(s => s && !s.match(/^(1-0|0-1|1\/2-1\/2|\*)$/));
  return { headers, moves };
}

// ═══════════════════════════════════════════════════════════════════
// 2. COMPONENTES VISUAIS
// ═══════════════════════════════════════════════════════════════════

// --- Botão estilizado para navegação do tabuleiro ---
const navBtnStyle = {
  width: 38, height: 32, borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 14, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function InteractiveBoard({ moves = [] }) {
  const [plyIndex, setPlyIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef(null);
  const moveListRef = useRef(null);
  const playRef = useRef(null);
  const [boardSize, setBoardSize] = useState(360);

  // Auto-detect container width for responsive board
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setBoardSize(Math.min(w, 500));
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const fenHistory = useMemo(() => generateFenHistory(moves), [moves]);
  const board = useMemo(() => fenToBoard(fenHistory[plyIndex] || INITIAL_FEN), [fenHistory, plyIndex]);
  const sq = boardSize / 8;

  useEffect(() => { setPlyIndex(0); setIsPlaying(false); }, [moves]);

  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setPlyIndex(prev => {
          if (prev >= fenHistory.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 800);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, fenHistory.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); setIsPlaying(false); setPlyIndex(i => Math.max(0, i - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setIsPlaying(false); setPlyIndex(i => Math.min(fenHistory.length - 1, i + 1)); }
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
    };
    const el = containerRef.current;
    if (el) el.addEventListener("keydown", handler);
    return () => { if (el) el.removeEventListener("keydown", handler); };
  }, [fenHistory.length]);

  // Auto-scroll move list
  useEffect(() => {
    if (moveListRef.current) {
      const active = moveListRef.current.querySelector("[data-active='true']");
      if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [plyIndex]);

  const lastMove = useMemo(() => {
    if (plyIndex === 0 || !moves[plyIndex - 1]) return null;
    const san = moves[plyIndex - 1].replace(/[+#!?]/g, "");
    if (san === "O-O" || san === "O-O-O") return null;
    const dest = san.match(/([a-h][1-8])/g);
    if (!dest) return null;
    return parseSquare(dest[dest.length - 1]);
  }, [plyIndex, moves]);

  const movePairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2)
      pairs.push({ num: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] || null, wPly: i + 1, bPly: i + 2 });
    return pairs;
  }, [moves]);

  return (
    <div ref={containerRef} tabIndex={0} style={{ outline: "none", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Tabuleiro */}
      <div style={{
        display: "inline-grid", gridTemplateColumns: `repeat(8, ${sq}px)`, gridTemplateRows: `repeat(8, ${sq}px)`,
        borderRadius: 8, overflow: "hidden", border: "2px solid rgba(255,255,255,0.08)",
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
              {ci === 0 && <span style={{ position: "absolute", top: 2, left: 3, fontSize: 9, fontWeight: 600, color: isLight ? "#8b6b4a" : "#e8dcc8", opacity: 0.5 }}>{8 - ri}</span>}
              {ri === 7 && <span style={{ position: "absolute", bottom: 1, right: 3, fontSize: 9, fontWeight: 600, color: isLight ? "#8b6b4a" : "#e8dcc8", opacity: 0.5 }}>{String.fromCharCode(97 + ci)}</span>}
            </div>
          );
        }))}
      </div>

      {/* Controles de navegação */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>
        <button onClick={() => { setIsPlaying(false); setPlyIndex(0); }} style={navBtnStyle}>⏮</button>
        <button onClick={() => { setIsPlaying(false); setPlyIndex(i => Math.max(0, i - 1)); }} style={navBtnStyle}>◀</button>
        <button onClick={() => setIsPlaying(p => !p)} style={{ ...navBtnStyle, background: isPlaying ? "rgba(139,115,85,0.3)" : navBtnStyle.background }}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={() => { setIsPlaying(false); setPlyIndex(i => Math.min(fenHistory.length - 1, i + 1)); }} style={navBtnStyle}>▶</button>
        <button onClick={() => { setIsPlaying(false); setPlyIndex(fenHistory.length - 1); }} style={navBtnStyle}>⏭</button>
      </div>

      {/* Lista de lances clicável */}
      {moves.length > 0 && (
        <div ref={moveListRef} style={{
          maxHeight: 120, overflowY: "auto", background: "rgba(0,0,0,0.3)",
          borderRadius: 8, padding: "6px 8px", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 0" }}>
            {movePairs.map(({ num, white, black, wPly, bPly }) => (
              <div key={num} style={{ display: "flex", alignItems: "center", marginRight: 4 }}>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", minWidth: 20, textAlign: "right", marginRight: 3 }}>{num}.</span>
                <span
                  data-active={plyIndex === wPly}
                  onClick={() => { setIsPlaying(false); setPlyIndex(wPly); }}
                  style={{
                    fontFamily: "monospace", fontSize: 12, padding: "1px 4px", borderRadius: 3, cursor: "pointer",
                    background: plyIndex === wPly ? "rgba(196,167,74,0.35)" : "transparent",
                    color: plyIndex === wPly ? "#fff" : "rgba(255,255,255,0.55)",
                    fontWeight: plyIndex === wPly ? 700 : 400,
                  }}
                >{white}</span>
                {black && (
                  <span
                    data-active={plyIndex === bPly}
                    onClick={() => { setIsPlaying(false); setPlyIndex(bPly); }}
                    style={{
                      fontFamily: "monospace", fontSize: 12, padding: "1px 4px", borderRadius: 3, cursor: "pointer",
                      background: plyIndex === bPly ? "rgba(196,167,74,0.35)" : "transparent",
                      color: plyIndex === bPly ? "#fff" : "rgba(255,255,255,0.55)",
                      fontWeight: plyIndex === bPly ? 700 : 400,
                    }}
                  >{black}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de posição */}
      <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
        {plyIndex === 0 ? "Posição inicial" : `Lance ${plyIndex} de ${moves.length}`} · ← → espaço
      </div>

      {/* Barra de progresso */}
      {moves.length > 0 && (
        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${(plyIndex / moves.length) * 100}%`,
            background: "linear-gradient(90deg, #8b7355, #c4a74a)", borderRadius: 2,
            transition: "width 0.2s",
          }} />
        </div>
      )}
    </div>
  );
}

// --- Rating Card (mostra todos os modos) ---
function RatingCard({ platform, username, ratings, loading, error, icon }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "20px 24px", flex: 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.4)" }}>{platform}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{username || "—"}</div>
        </div>
      </div>
      {loading ? <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Carregando...</div>
        : error ? <div style={{ color: "#e85d5d", fontSize: 13 }}>{error}</div>
        : ratings && Object.keys(ratings).length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(ratings).map(([mode, rating]) => (
              <div key={mode} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{mode}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#c4a74a" }}>{rating}</span>
              </div>
            ))}
          </div>
        ) : <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Insira o username</div>}
    </div>
  );
}

// --- Linha de partida ---
function GameRow({ game, onClick, selected }) {
  const rc = game.result === "win" ? "#7fa650" : game.result === "loss" ? "#e85d5d" : "#c4a74a";
  const label = game.result === "win" ? "V" : game.result === "loss" ? "D" : "E";
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14, padding: "10px 14px",
      background: selected ? "rgba(255,255,255,0.06)" : "transparent",
      borderLeft: selected ? `3px solid ${rc}` : "3px solid transparent",
      borderRadius: 8, cursor: "pointer", transition: "background 0.15s",
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = selected ? "rgba(255,255,255,0.06)" : "transparent"; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: `${rc}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 13, color: rc, flexShrink: 0,
      }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          vs {game.opponent || "Anônimo"}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
          {game.opening || game.timeControl || ""} · {game.platform}
        </div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{game.date}</div>
    </div>
  );
}

// --- Treinador IA Gemini (com gating Pro) ---
function AICoachPanel({ game, session, onUpgrade }) {
  const [analysis, setAnalysis] = useState(null);
  const [prefs, setPrefs] = useState(null);

  const fetchPrefs = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('training_prefs')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (data) setPrefs(data);
  }, [session]);

  // Coloque este useEffect para rodar a busca quando o session mudar
  useEffect(() => {
    if (session) fetchPrefs();
  }, [session, fetchPrefs]);

  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async () => {
    if (!game) return;
    setLoading(true); setAnalysis(null);
    try {
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pgn: game.moves?.join(" ") || "N/A",
          evaluation: 0.0,
          player_rating: 1200,
        }),
      });

      // Gating: limite atingido
      if (res.status === 403) {
        const data = await res.json();
        setAnalysis(data.message || "Limite de análises atingido.");
        if (onUpgrade) onUpgrade();
        setLoading(false);
        return;
      }

      const data = await res.json();
      setAnalysis(data.feedback || "Sem resposta do treinador.");
    } catch {
      setAnalysis("Erro ao conectar ao servidor Python. Verifique se o backend está rodando.");
    }
    setLoading(false);
  }, [game, session, onUpgrade]);

  useEffect(() => { setAnalysis(null); }, [game]);

  if (!game) return (
    <div style={{ padding: 24, textAlign: "center", opacity: 0.3, fontSize: 13 }}>
      🎓 Selecione uma partida para ativar a IA
    </div>
  );

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", padding: 20, borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#c4a74a" }}>🤖 Treinador Gemini</h3>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
        {game.opponent ? `vs ${game.opponent}` : ""} {game.opening ? `· ${game.opening}` : ""}
      </div>
      {loading ? (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Analisando lances...</p>
      ) : (
        <>
          {analysis && (
            <div style={{
              fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.8)",
              padding: 14, background: "rgba(0,0,0,0.2)", borderRadius: 10, marginBottom: 12,
              whiteSpace: "pre-wrap",
            }}>{analysis}</div>
          )}
          <button onClick={analyze} style={{
            padding: "10px", width: "100%", cursor: "pointer", borderRadius: 8,
            background: "#8b7355", color: "white", border: "none", fontWeight: 600, fontSize: 13,
          }}>
            {analysis ? "Re-analisar" : "Analisar com IA"}
          </button>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GRÁFICO DE RATING (Canvas, sem dependências)
// ═══════════════════════════════════════════════════════════════════
function RatingChart({ lichessUser }) {
  const canvasRef = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [selectedMode, setSelectedMode] = useState("blitz");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch rating history from Lichess
  useEffect(() => {
    if (!lichessUser.trim()) return;
    setLoading(true); setError(null);
    fetch(`${LICHESS_API}/user/${lichessUser.trim()}/rating-history`)
      .then(r => { if (!r.ok) throw new Error("Não encontrado"); return r.json(); })
      .then(data => {
        const parsed = {};
        for (const category of data) {
          const name = category.name.toLowerCase();
          if (category.points && category.points.length > 0) {
            parsed[name] = category.points.map(([y, m, d, r]) => ({
              date: new Date(y, m, d),
              rating: r,
            }));
          }
        }
        setChartData(parsed);
        // Auto-select first available mode
        const available = Object.keys(parsed);
        if (available.length > 0 && !parsed[selectedMode]) {
          setSelectedMode(available[0]);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [lichessUser]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData || !chartData[selectedMode]) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const points = chartData[selectedMode];
    if (points.length < 2) return;

    // Only show last 6 months of data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const filtered = points.filter(p => p.date >= sixMonthsAgo);
    const data = filtered.length >= 2 ? filtered : points.slice(-60);

    const ratings = data.map(p => p.rating);
    const minR = Math.min(...ratings) - 30;
    const maxR = Math.max(...ratings) + 30;
    const rangeR = maxR - minR || 1;

    const padLeft = 45, padRight = 15, padTop = 15, padBottom = 30;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padTop + (chartH / gridSteps) * i;
      ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(w - padRight, y); ctx.stroke();
      const val = Math.round(maxR - (rangeR / gridSteps) * i);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(val, padLeft - 6, y + 3);
    }

    // Date labels
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    const labelCount = Math.min(5, data.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (data.length - 1));
      const x = padLeft + (idx / (data.length - 1)) * chartW;
      const d = data[idx].date;
      ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, x, h - 6);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = "#c4a74a";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    data.forEach((p, i) => {
      const x = padLeft + (i / (data.length - 1)) * chartW;
      const y = padTop + chartH - ((p.rating - minR) / rangeR) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Area fill
    const lastX = padLeft + chartW;
    const lastY = padTop + chartH - ((data[data.length - 1].rating - minR) / rangeR) * chartH;
    ctx.lineTo(lastX, padTop + chartH);
    ctx.lineTo(padLeft, padTop + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, "rgba(196,167,74,0.2)");
    grad.addColorStop(1, "rgba(196,167,74,0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Current rating dot
    const curX = lastX;
    const curY = lastY;
    ctx.beginPath();
    ctx.arc(curX, curY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#c4a74a";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(data[data.length - 1].rating, curX - 8, curY - 8);

  }, [chartData, selectedMode]);

  if (!lichessUser.trim()) return null;

  const modes = chartData ? Object.keys(chartData) : [];

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "20px 24px", marginBottom: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
          📈 Evolução de Rating — Lichess
        </div>
        {modes.length > 0 && (
          <div style={{ display: "flex", gap: 4 }}>
            {modes.map(m => (
              <button key={m} onClick={() => setSelectedMode(m)} style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
                background: selectedMode === m ? "rgba(196,167,74,0.2)" : "transparent",
                color: selectedMode === m ? "#c4a74a" : "rgba(255,255,255,0.35)",
                fontWeight: selectedMode === m ? 600 : 400, textTransform: "capitalize",
              }}>{m}</button>
            ))}
          </div>
        )}
      </div>
      {loading ? <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, padding: 20, textAlign: "center" }}>Carregando histórico...</div>
        : error ? <div style={{ color: "#e85d5d", fontSize: 12, padding: 20, textAlign: "center" }}>{error}</div>
        : <canvas ref={canvasRef} style={{ width: "100%", height: 180, display: "block" }} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// UI DO PLANO DE TREINO (VISUAL)
// ═══════════════════════════════════════════════════════════════════

// 1. O Mapa de Calor (Heatmap) Visual (Mockup)
function PerformanceHeatmap({ games = [] }) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hours = ["00h", "04h", "08h", "12h", "16h", "20h"];

  // Processamento Matemático do Heatmap usando useMemo para performance
  const heatmapData = useMemo(() => {
    // Cria uma matriz vazia de 7 dias (linhas) x 24 horas (colunas)
    const matrix = Array(7).fill(null).map(() => 
      Array(24).fill(null).map(() => ({ total: 0, wins: 0 }))
    );

    games.forEach(game => {
      if (!game.timestamp) return; // Prevenção se a partida não tiver hora
      
      const d = new Date(game.timestamp);
      const day = d.getDay(); // 0 = Domingo, 6 = Sábado
      const hour = d.getHours(); // 0 a 23
      
      matrix[day][hour].total += 1;
      if (game.result === "win") {
        matrix[day][hour].wins += 1;
      }
    });

    return matrix;
  }, [games]);

  // Lógica para decidir a cor do quadrado
  const getCellColor = (data) => {
    if (data.total === 0) return "rgba(255,255,255,0.02)"; // Sem partidas: Cinza super escuro
    
    const winRate = data.wins / data.total;
    // Quanto mais partidas, mais forte é a cor (máximo de 0.9 de opacidade)
    const alpha = Math.min(0.3 + (data.total * 0.15), 0.9); 

    if (winRate >= 0.55) return `rgba(127, 166, 80, ${alpha})`; // > 55% = Verde (Bom horário)
    if (winRate <= 0.45) return `rgba(232, 93, 93, ${alpha})`; // < 45% = Vermelho (Horário perigoso)
    return `rgba(196, 167, 74, ${alpha})`; // Meio a meio = Dourado/Neutro
  };

  // Lógica para a mensagem que aparece quando passa o mouse por cima
  const getTooltip = (dayStr, hour, data) => {
    if (data.total === 0) return `${dayStr} às ${hour}h: Nenhuma partida registada.`;
    const wr = Math.round((data.wins / data.total) * 100);
    return `${dayStr} às ${hour}h: ${wr}% Vitórias (${data.wins}V em ${data.total} partidas)`;
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 24, marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
      <h3 style={{ margin: "0 0 16px", color: "#c4a74a", fontSize: 16 }}>🔥 Heatmap de Performance (Taxa de Vitória)</h3>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16, lineHeight: 1.5 }}>
        Descubra os seus horários de pico. <strong style={{color: "#7fa650"}}>Verde</strong> = Horário para subir rating. <strong style={{color: "#e85d5d"}}>Vermelho</strong> = Tilt! Jogue o Treino da IA em vez de ranqueadas. Passe o mouse para ver os detalhes.
      </p>
      
      <div className="heatmap-wrapper">
        {/* Rótulos dos Dias da Semana */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", color: "rgba(255,255,255,0.3)", fontSize: 10, paddingTop: 16, paddingBottom: 8 }}>
          {days.map(d => <span key={d}>{d}</span>)}
        </div>
        
        {/* Grelha de Horas */}
        <div className="heatmap-grid-container">
            <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.3)", fontSize: 10, marginBottom: 8 }}>
              {hours.map(h => <span key={h}>{h}</span>)}
            </div>
            <div style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: 4 }}>
               {heatmapData.map((hoursArray, dayIndex) => (
                 <div key={dayIndex} style={{ display: "flex", gap: 4 }}>
                   {hoursArray.map((cellData, hourIndex) => (
                     <div 
                       key={hourIndex} 
                       style={{ 
                         height: 14, 
                         flex: 1, 
                         background: getCellColor(cellData), 
                         borderRadius: 2,
                         cursor: "crosshair",
                         transition: "transform 0.1s"
                       }} 
                       title={getTooltip(days[dayIndex], hourIndex, cellData)}
                       onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
                       onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                     />
                   ))}
                 </div>
               ))}
            </div>
        </div>
      </div>
    </div>
  )
}

// 2. Componente de Configuração do Treino (Preferências)
// Não esqueça de garantir que o 'supabase' está importado no topo do arquivo se já não estiver!
function TrainingPreferences({ session, onSaveSuccess }) {
  const [time, setTime] = useState(30);
  const [puzzles, setPuzzles] = useState(40);
  const [ownGames, setOwnGames] = useState(40);
  const [masterGames, setMasterGames] = useState(20);
  const [saving, setSaving] = useState(false);

  // Função para enviar para o Supabase
  const savePreferences = async () => {
    if (!session) {
      alert("Faça login para salvar suas preferências!");
      return;
    }
    
    setSaving(true);
    
    // O upsert atualiza se já existir, ou cria se for novo
    const { error } = await supabase
      .from('training_prefs')
      .upsert({ 
        user_id: session.user.id, 
        time_available: time,
        puzzle_pct: puzzles,
        own_games_pct: ownGames,
        master_games_pct: masterGames,
        updated_at: new Date()
      }, { onConflict: 'user_id' });

    setSaving(false);
    
    if (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar preferências.");
    } else {
      alert("Configurações de treino salvas com sucesso! 🚀");
    }
    if (onSaveSuccess) onSaveSuccess();
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 24, marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "#fff", fontSize: 16 }}>⚙️ Configurar Meu Treinamento</h3>
        <button 
          onClick={savePreferences}
          disabled={saving || !session}
          style={{ 
            background: session ? "#c4a74a" : "#555", 
            color: "black", border: "none", padding: "6px 16px", 
            borderRadius: 8, fontWeight: "bold", cursor: session ? "pointer" : "not-allowed" 
          }}
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
      
      <div className="training-sliders-row">
        {/* Slider de Tempo */}
        <div className="training-slider-box">
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 16 }}>Tempo diário disponível:</label>
          <input 
            type="range" min="15" max="120" step="15" 
            value={time} onChange={(e) => setTime(parseInt(e.target.value))} 
            style={{ width: "100%", accentColor: "#c4a74a" }} 
          />
          <div style={{ textAlign: "center", fontSize: 18, fontWeight: "bold", marginTop: 8, color: "#c4a74a" }}>
            {time} min
          </div>
        </div>

        {/* Sliders de Distribuição */}
        <div className="training-slider-box-wide">
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 16 }}>
            Distribuição do Foco (Total: {puzzles + ownGames + masterGames}%):
          </label>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, marginBottom: 12 }}>
             <span style={{ color: "#7fa650", width: 140 }}>🧩 Puzzles ({puzzles}%)</span>
             <input type="range" min="0" max="100" step="10" value={puzzles} onChange={(e) => setPuzzles(parseInt(e.target.value))} style={{ flex: 1, accentColor: "#7fa650" }} />
          </div>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, marginBottom: 12 }}>
             <span style={{ color: "#c4a74a", width: 140 }}>♟️ Minhas Partidas ({ownGames}%)</span>
             <input type="range" min="0" max="100" step="10" value={ownGames} onChange={(e) => setOwnGames(parseInt(e.target.value))} style={{ flex: 1, accentColor: "#c4a74a" }} />
          </div>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
             <span style={{ color: "#e85d5d", width: 140 }}>👑 Partidas Mestre ({masterGames}%)</span>
             <input type="range" min="0" max="100" step="10" value={masterGames} onChange={(e) => setMasterGames(parseInt(e.target.value))} style={{ flex: 1, accentColor: "#e85d5d" }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// 3. Quests Diárias (As missões geradas)
function DailyQuests({ prefs, onStartPuzzles }) {
  if (!prefs) {
    return (
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 32, border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Nenhum plano gerado. Guarde as suas configurações de treino primeiro!</p>
      </div>
    );
  }

  // Matemática do Gerador de Missões
  const puzzleTime = Math.round((prefs.time_available * prefs.puzzle_pct) / 100);
  const ownTime = Math.round((prefs.time_available * prefs.own_games_pct) / 100);
  const masterTime = Math.round((prefs.time_available * prefs.master_games_pct) / 100);

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "#fff", fontSize: 16 }}>📋 O Teu Plano de Hoje ({prefs.time_available} min)</h3>
        <span style={{ fontSize: 11, background: "rgba(196,167,74,0.2)", color: "#c4a74a", padding: "4px 8px", borderRadius: 4, fontWeight: "bold" }}>
          Gerado Proceduralmente
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        
        {puzzleTime > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(127, 166, 80, 0.08)", padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(127, 166, 80, 0.2)" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #7fa650" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>Treino Tático (Puzzles)</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Tempo alocado: {puzzleTime} min</div>
            </div>
            <button onClick={onStartPuzzles}
            style={{ background: "#7fa650", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Praticar</button>
          </div>
        )}

        {ownTime > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(196, 167, 74, 0.08)", padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(196, 167, 74, 0.2)" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #c4a74a" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>Analisar os Teus Erros com a IA</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Tempo alocado: {ownTime} min</div>
            </div>
            <button style={{ background: "#c4a74a", border: "none", color: "black", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Carregar Partida</button>
          </div>
        )}

        {masterTime > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(232, 93, 93, 0.08)", padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(232, 93, 93, 0.2)" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #e85d5d" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>Estudar Partidas de Mestre</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Tempo alocado: {masterTime} min</div>
            </div>
            <button style={{ background: "#e85d5d", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Ver Mestres</button>
          </div>
        )}

      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════
// 3. COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [selectedRival, setSelectedRival] = useState(null);
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [lichessUser, setLichessUser] = useState("");
  const [chesscomUser, setChesscomUser] = useState("");
  const [lichessData, setLichessData] = useState({ ratings: null, loading: false, error: null });
  const [chesscomData, setChesscomData] = useState({ ratings: null, loading: false, error: null });
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [tab, setTab] = useState("all");
  const [loadingGames, setLoadingGames] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [userPlan, setUserPlan] = useState("free");
  const [prefs, setPrefs] = useState(null);
  const [isEditingConnection, setIsEditingConnection] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null); // Novo estado para saber se há perfil salvo
  const [showLogin, setShowLogin] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const location = useLocation();
const isBlogActive = location.pathname.startsWith('/blog');
  const linkAccounts = async () => {
  if (!session?.user) return;
  await supabase.from('profiles').upsert({
    id: session.user.id,
    lichess_username: lichessUser,
    chesscom_username: chesscomUser,
  });
  setIsLinked(true);
  setIsEditingConnection(false);
  fetchGames(); // recarrega partidas com os novos nomes
};
  

  const handleSelectRival = (rivalName) => {
  setSelectedRival(prev => prev === rivalName ? null : rivalName);
  setSelectedGame(null); // Limpa a partida selecionada ao trocar de rival
};

  const fetchPrefs = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('training_prefs')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (data) setPrefs(data);
  }, [session]);


  useEffect(() => {
  async function loadUsernames() {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('lichess_username, chesscom_username')
      .eq('id', session.user.id)
      .single();
    
    if (data) {
      if (data.lichess_username) setLichessUser(data.lichess_username);
      if (data.chesscom_username) setChesscomUser(data.chesscom_username);
    }
  }
  loadUsernames();
}, [session]);

  useEffect(() => {
    if (session) fetchPrefs();
  }, [session, fetchPrefs]);

  // --- Monitor de sessão Supabase ---
  // --- Monitor de sessão Supabase ---

  // Carrega os usernames salvos no banco de dados assim que o usuário loga
useEffect(() => {
  async function loadProfile() {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('lichess_username, chesscom_username')
      .eq('id', session.user.id)
      .single();

    if (data && (data.lichess_username || data.chesscom_username)) {
      setLichessUser(data.lichess_username || "");
      setChesscomUser(data.chesscom_username || "");
      setIsLinked(true); // Se achou nomes, está vinculado!
    } else {
      setIsEditingConnection(true); // Se não tem nada, abre os inputs
    }
  }
  loadProfile();
}, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Busca plano do usuário ao logar ---
  useEffect(() => {
    if (!session) { 
      setUserPlan("free"); 
      return; 
    }

    const checkPlan = async () => {
      try {
        // CORREÇÃO AQUI: Usando crases (backticks) para permitir o ${}
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const res = await fetch(`${baseUrl}/user/plan`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setUserPlan(data.plan || "free");
      } catch (err) {
        console.error("Erro ao buscar plano:", err);
        setUserPlan("free");
      }
    };

    checkPlan();
  }, [session]);

  // --- Detecta retorno do Stripe checkout ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setUserPlan("pro");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // --- Fetch ratings ---
  const fetchLichess = useCallback(async () => {
    if (!lichessUser.trim()) return;
    setLichessData({ ratings: null, loading: true, error: null });
    try {
      const res = await fetch(`${LICHESS_API}/user/${lichessUser.trim()}`);
      if (!res.ok) throw new Error("Usuário não encontrado");
      const data = await res.json();
      const p = data.perfs || {};
      const ratings = {};
      if (p.bullet) ratings.Bullet = p.bullet.rating;
      if (p.blitz) ratings.Blitz = p.blitz.rating;
      if (p.rapid) ratings.Rapid = p.rapid.rating;
      if (p.classical) ratings.Classical = p.classical.rating;
      if (p.puzzle) ratings.Puzzles = p.puzzle.rating;
      setLichessData({ ratings, loading: false, error: null });
    } catch (e) { setLichessData({ ratings: null, loading: false, error: e.message }); }
  }, [lichessUser]);

  const fetchChesscom = useCallback(async () => {
    if (!chesscomUser.trim()) return;
    setChesscomData({ ratings: null, loading: true, error: null });
    try {
      const res = await fetch(`${CHESSCOM_API}/${chesscomUser.trim()}/stats`);
      if (!res.ok) throw new Error("Usuário não encontrado");
      const data = await res.json();
      const ratings = {};
      if (data.chess_bullet?.last?.rating) ratings.Bullet = data.chess_bullet.last.rating;
      if (data.chess_blitz?.last?.rating) ratings.Blitz = data.chess_blitz.last.rating;
      if (data.chess_rapid?.last?.rating) ratings.Rapid = data.chess_rapid.last.rating;
      if (data.chess_daily?.last?.rating) ratings.Daily = data.chess_daily.last.rating;
      if (data.tactics?.highest?.rating) ratings.Puzzles = data.tactics.highest.rating;
      setChesscomData({ ratings, loading: false, error: null });
    } catch (e) { setChesscomData({ ratings: null, loading: false, error: e.message }); }
  }, [chesscomUser]);

  // --- Fetch games (Lichess + Chess.com) ---
  // --- Busca partidas (Lichess + Chess.com) e salva no Supabase ---
  const fetchGames = useCallback(async () => {
    if (!lichessUser.trim() && !chesscomUser.trim()) return;
    
    setLoadingGames(true);
    const all = [];

    // --- LÓGICA LICHESS ---
    if (lichessUser.trim()) {
      try {
        const res = await fetch(`${LICHESS_API}/games/user/${lichessUser.trim()}?max=200&opening=true&pgnInJson=true`, { 
          headers: { Accept: "application/x-ndjson" } 
        });
        const text = await res.text();
        for (const line of text.trim().split("\n").filter(Boolean)) {
          try {
            const g = JSON.parse(line);
            const isW = g.players?.white?.user?.name?.toLowerCase() === lichessUser.trim().toLowerCase();
            const opp = isW ? g.players?.black?.user?.name || "Anônimo" : g.players?.white?.user?.name || "Anônimo";
            let result = "draw";
            if (g.winner === "white" && isW) result = "win";
            else if (g.winner === "black" && !isW) result = "win";
            else if (g.winner) result = "loss";
            
            all.push({
              id: g.id, 
              platform: "Lichess",
              white: isW ? lichessUser.trim() : opp,
              black: isW ? opp : lichessUser.trim(),
              playerColor: isW ? "Brancas" : "Pretas",
              opponent: opp, 
              result,
              resultText: !g.winner ? "Empate" : g.winner === "white" ? "Brancas vencem" : "Pretas vencem",
              opening: g.opening?.name || "",
              timeControl: g.speed || "",
              date: new Date(g.createdAt).toLocaleDateString("pt-BR"),
              timestamp: g.createdAt,
              pgn: g.pgn || "",
              moves: g.moves?.split(" ") || [],
            });
          } catch (e) { console.error("Erro no parse do jogo Lichess:", e); }
        }
      } catch (e) { console.error("Erro ao buscar jogos Lichess:", e); }
    }

    // --- LÓGICA CHESS.COM ---
    if (chesscomUser.trim()) {
      try {
        const archRes = await fetch(`${CHESSCOM_API}/${chesscomUser.trim()}/games/archives`);
        const archData = await archRes.json();
        const archives = archData.archives || [];
        if (archives.length > 0) {
          const lastMonthUrl = archives[archives.length - 1];
          const gamesRes = await fetch(lastMonthUrl);
          const gamesData = await gamesRes.json();
          
          for (const g of (gamesData.games || []).slice(-20)) {
            try {
              const isW = g.white?.username?.toLowerCase() === chesscomUser.trim().toLowerCase();
              const opp = isW ? g.black?.username || "Anônimo" : g.white?.username || "Anônimo";
              const myRes = isW ? g.white?.result : g.black?.result;
              let result = "draw";
              if (myRes === "win") result = "win";
              else if (["checkmated", "timeout", "resigned", "abandoned"].includes(myRes)) result = "loss";
              
              const { headers, moves } = parsePGN(g.pgn || "");
              all.push({
                id: g.url || Math.random().toString(),
                platform: "Chess.com",
                white: isW ? chesscomUser.trim() : opp,
                black: isW ? opp : chesscomUser.trim(),
                playerColor: isW ? "Brancas" : "Pretas",
                opponent: opp, 
                result,
                resultText: headers.Result || "",
                opening: headers.ECOUrl?.split("/").pop()?.replace(/-/g, " ") || headers.Opening || "",
                timeControl: g.time_class || "",
                date: new Date((g.end_time || 0) * 1000).toLocaleDateString("pt-BR"),
                timestamp: (g.end_time || 0) * 1000,
                pgn: g.pgn || "",
                moves,
              });
            } catch (e) { console.error("Erro no parse do jogo Chess.com:", e); }
          }
        }
      } catch (e) { console.error("Erro ao buscar jogos Chess.com:", e); }
    }

    // Ordenação final
    // 1. Ordenação (mantenha a que você já tem)
    all.sort((a, b) => b.date.split("/").reverse().join("").localeCompare(a.date.split("/").reverse().join("")));

    // --- INÍCIO DA TRAVA DE SEGURANÇA ---
    if (session?.user && all.length > 0) {
      // Busca o perfil oficial para comparar
      const { data: profile } = await supabase
        .from('profiles')
        .select('lichess_username, chesscom_username')
        .eq('id', session.user.id)
        .single();

      // Filtra apenas os jogos que pertencem ao dono da conta e mapeia para o banco
      const gamesToSave = all
        .filter(g => {
          const isMyLichess = g.platform === "Lichess" && 
            lichessUser.toLowerCase() === profile?.lichess_username?.toLowerCase();
          const isMyChesscom = g.platform === "Chess.com" && 
            chesscomUser.toLowerCase() === profile?.chesscom_username?.toLowerCase();
          
          return isMyLichess || isMyChesscom;
        })
        .map(g => ({
          user_id: session.user.id,
          external_id: g.id.toString(),
          platform: g.platform === "Lichess" ? 'lichess' : 'chesscom',
          pgn: g.pgn,
          opponent: g.opponent,
          result: g.result,
          player_color: g.playerColor === "Brancas" ? 'white' : 'black',
          opening: g.opening,
          time_control: g.timeControl,
          played_at: new Date(g.timestamp).toISOString(),
        }));

      // Só envia para o Supabase se houver jogos autorizados
      if (gamesToSave.length > 0) {
        await supabase.from('games').upsert(gamesToSave, { onConflict: 'user_id, external_id' });
      }
    }
    // --- FIM DA TRAVA DE SEGURANÇA ---

    setGames(all);
    setLoadingGames(false);
  }, [lichessUser, chesscomUser, session]); // Não esqueça de garantir 'session' aqui nas dependências


  const loadGamesFromDB = useCallback(async () => {
    if (!session?.user) return;
    setLoadingGames(true);

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('played_at', { ascending: false });

    if (data) {
      const formatted = data.map(g => {
  const isWhite = g.player_color === 'white';
  // Pega o seu nome de usuário baseado na plataforma
  const myName = g.platform === 'lichess' ? lichessUser : chesscomUser;

  return {
    ...g,
    // Reconstrói as propriedades que o AnalysisBoard espera
    white: isWhite ? (myName || "Você") : g.opponent,
    black: isWhite ? g.opponent : (myName || "Você"),
    playerColor: isWhite ? 'Brancas' : 'Pretas',
    moves: parsePgnToMoves(g.pgn)
  };
});
      setGames(formatted);
    }
    setLoadingGames(false);
  }, [session]);

  useEffect(() => {
    if (session) {
      loadGamesFromDB();
    }
  }, [session, loadGamesFromDB]);
  // === FIM DO CÓDIGO NOVO ===

  // Carrega os usernames do banco assim que logar
useEffect(() => {
  async function loadProfile() {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('lichess_username, chesscom_username')
      .eq('id', session.user.id)
      .single();

    if (data) {
      if (data.lichess_username) setLichessUser(data.lichess_username);
      if (data.chesscom_username) setChesscomUser(data.chesscom_username);
    }
  }
  loadProfile();
}, [session]);


  

  const loadAll = () => { fetchLichess(); fetchChesscom(); fetchGames(); };

  const filtered = useMemo(() => {
    let filteredGames = games;
    if (tab !== "all") {
      filteredGames = filteredGames.filter(g => 
        g.platform === (tab === "lichess" ? "Lichess" : "Chess.com")
      );
    }
    if (selectedRival) {
      filteredGames = filteredGames.filter(g => 
        g.opponent?.toLowerCase() === selectedRival.toLowerCase()
      );
    }
    return filteredGames;
  }, [games, tab, selectedRival]);


  // Se não está logado, mostra a landing page
if (!session) {
  return (
    <>
      <LandingPage
        onLogin={() => setShowLogin(true)}
        onPricing={() => setShowPricing(true)}
      />

      {/* Modal de login */}
      {showLogin && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowLogin(false)}
        >
          <div
            style={{
              background: '#111', padding: 24, borderRadius: 16,
              maxWidth: 400, width: '90%', border: '1px solid rgba(196,167,74,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <AuthForm />
            <button
              onClick={() => setShowLogin(false)}
              style={{
                marginTop: 16, width: '100%', padding: 10,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: '#ccc', cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {showPricing && (
        <PricingPage onClose={() => setShowPricing(false)} session={session} />
      )}
    </>
  );
}

  return (
    <div className="app-shell">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <main className="app-main">
      
        <header className="app-header">
          <div>
            <h1 style={{ fontSize: 24, margin: 0, color: "#c4a74a", fontWeight: 700 }}>♟ ChessPlan</h1>
          </div>

          <div className="header-actions">
            {isEditingConnection ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input 
                  value={lichessUser} 
                  onChange={e => setLichessUser(e.target.value)}
                  placeholder="Lichess @..." 
                  className="header-input" 
                />
                <input 
                  value={chesscomUser} 
                  onChange={e => setChesscomUser(e.target.value)}
                  placeholder="Chess.com @..." 
                  className="header-input" 
                />
                <button onClick={linkAccounts} style={btnLinkStyle}>Vincular e Sincronizar</button>
                {isLinked && (
                  <button onClick={() => setIsEditingConnection(false)} style={btnCancelStyle}>Cancelar</button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  Conectado: <span style={{ color: "#c4a74a", fontWeight: 600 }}>{lichessUser || chesscomUser}</span>
                </div>
                <button onClick={() => { fetchGames(); }} style={btnSyncSmall}>🔄</button>
                <button onClick={() => setIsEditingConnection(true)} style={btnEditSmall}>⚙️</button>
              </div>
            )}
          </div>
        </header>

        

        <div className="nav-tabs">




        <Link to="/blog" style={{
  // Remove o estilo padrão de link (azul e sublinhado)
  textDecoration: "none", 
  display: "inline-block",
  
  // Seus estilos originais adaptados
  background: isBlogActive ? "rgba(196,167,74,0.2)" : "transparent",
  color: isBlogActive ? "#c4a74a" : "rgba(255,255,255,0.5)",
  border: "none", 
  padding: "8px 16px", 
  borderRadius: 8,
  cursor: "pointer", 
  fontWeight: 600,
  transition: "all 0.2s"
}}>
  📝 Blog
</Link>

  <NavLink to="/" end style={({ isActive }) => ({ background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', color: isActive ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 })}>
  📊 Histórico e Análise
</NavLink>
<NavLink to="/treino" style={({ isActive }) => ({ background: isActive ? 'rgba(196,167,74,0.2)' : 'transparent', color: isActive ? '#c4a74a' : 'rgba(255,255,255,0.5)', border: 'none', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 })}>
  🎓 Plano de Treino Diário
</NavLink>
<NavLink to="/cursos" style={({ isActive }) => ({ background: isActive ? 'rgba(196,167,74,0.2)' : 'transparent', color: isActive ? '#c4a74a' : 'rgba(255,255,255,0.5)', border: 'none', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 })}>
  📚 Cursos
</NavLink>
                </div>

        <Routes>
        <Route path="/" element={
  <div className="fade-in">
    <div className="rating-cards-row">
      <RatingCard platform="Lichess" username={lichessUser} ratings={lichessData.ratings} loading={lichessData.loading} error={lichessData.error} icon="🐴" />
      <RatingCard platform="Chess.com" username={chesscomUser} ratings={chesscomData.ratings} loading={chesscomData.loading} error={chesscomData.error} icon="♟️" />
    </div>

    <RatingChart lichessUser={lichessUser} />
    <Rivalrytracker games={games} onSelectRival={handleSelectRival} selectedRival={selectedRival} />
    <BlunderHeatmap games={games} />
    <OpeningExplorer games={games} />

    {games.length > 0 && (
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[{ k: "all", l: "Todas" }, { k: "lichess", l: "Lichess" }, { k: "chesscom", l: "Chess.com" }].map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)} style={{
            fontSize: 11, fontWeight: tab === k ? 600 : 400, padding: "5px 12px", borderRadius: 5,
            border: "none", background: tab === k ? "rgba(255,255,255,0.08)" : "transparent",
            color: tab === k ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>
    )}

    <div className="games-board-row">
      <div className="games-list-container">
        {loadingGames ? (
          <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Buscando partidas...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
            {games.length === 0 ? "Conecte um username para ver suas partidas" : "Nenhuma partida neste filtro"}
          </div>
        ) : (
          filtered.map(g => (
            <GameRow key={g.id} game={g} selected={selectedGame?.id === g.id} onClick={() => {
              setSelectedGame(g);
              navigate('/analise'); // <-- use navigate, não setMainView
            }} />
          ))
        )}
      </div>

      <div className="board-container">
        <InteractiveBoard moves={selectedGame?.moves || []} />
        {selectedGame && (
          <div style={{ marginTop: 12, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            <div style={{ color: "#fff", fontSize: 13, marginBottom: 4 }}>
              <strong>{selectedGame.white || "?"}</strong>
              <span style={{ margin: "0 6px", opacity: 0.3 }}>vs</span>
              <strong>{selectedGame.black || "?"}</strong>
            </div>
            {selectedGame.opening && <div>Abertura: {selectedGame.opening}</div>}
            <div>{selectedGame.resultText || selectedGame.result} · {selectedGame.platform} · {selectedGame.timeControl}</div>
          </div>
        )}
      </div>
    </div>
  </div>
} />
<Route path="/curso/:id" element={
  <CourseView
    courseId={selectedCourseId}
    session={session}
    onBack={() => navigate('/cursos')}
  />
} />
<Route path="/puzzles" element={
  <PuzzleArena onBack={() => navigate('/treino')} />
} />
<Route path="/analise" element={
  selectedGame ? (
    <AnalysisBoard game={selectedGame} session={session} onBack={() => navigate('/')} />
  ) : (
    <Navigate to="/" replace />
  )
} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/termos" element={<LegalPage type="termos" />} />
<Route path="/privacidade" element={<LegalPage type="privacidade" />} />
<Route path="/reembolso" element={<LegalPage type="reembolso" />} />
        <Route path="/cursos" element={
  <CourseCatalog
    session={session}
    onSelectCourse={(course) => {
      setSelectedCourseId(course.id);
      navigate(`/curso/${course.id}`);
    }}
  />
} />
        <Route path="/treino" element={
  <div className="fade-in">
    <PerformanceHeatmap games={games} />
    <TrainingPreferences session={session} onSaveSuccess={fetchPrefs} />
    <DailyQuests prefs={prefs} onStartPuzzles={() => navigate('/puzzles')} />
  </div>
} />
      </Routes>


        


        


        

      </main>

      <aside className="app-sidebar">
        {!session ? (
          <div style={{ padding: 20 }}>
            <AuthForm />
            <button onClick={() => setShowPricing(true)} style={{
              width: "100%", marginTop: 12, padding: "10px", borderRadius: 8, border: "1px solid rgba(196,167,74,0.2)",
              background: "rgba(196,167,74,0.06)", color: "#c4a74a", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Ver planos</button>
          </div>
        ) : (
          <div className="sidebar-content">
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 8,
              background: userPlan === "pro" ? "rgba(196,167,74,0.06)" : "rgba(127,166,80,0.08)",
              border: `1px solid ${userPlan === "pro" ? "rgba(196,167,74,0.15)" : "rgba(127,166,80,0.15)"}`,
            }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                ● {session.user.email.split("@")[0]}
              </div>
              <PlanBadge plan={userPlan} onClick={() => setShowPricing(true)} />
            </div>

            <AICoachPanel game={selectedGame} session={session} onUpgrade={() => setShowUpgrade(true)} />

            {games.length > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16,
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Resumo</div>
                <div style={{ display: "flex", gap: 16, textAlign: "center" }}>
                  {[
                    { l: "V", v: games.filter(g => g.result === "win").length, c: "#7fa650" },
                    { l: "D", v: games.filter(g => g.result === "loss").length, c: "#e85d5d" },
                    { l: "E", v: games.filter(g => g.result === "draw").length, c: "#c4a74a" },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ flex: 1 }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => supabase.auth.signOut()} style={{
              marginTop: 'auto', background: 'none', border: '1px solid #2a2a2a',
              color: '#555', padding: 10, cursor: 'pointer', borderRadius: 8, fontSize: 12,
            }}>
              Sair da Conta
            </button>
          </div>
        )}
           </aside>

      {showPricing && (
        <PricingPage onClose={() => setShowPricing(false)} session={session} />
      )}
      {showUpgrade && (
        <UpgradeModal
          feature="Análises IA ilimitadas"
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => { setShowUpgrade(false); setShowPricing(true); }}
        />
      )}

      {/* FOOTER DENTRO DO MESMO DIV PRINCIPAL */}
      <footer style={{ 
        marginTop: '50px', 
        padding: '20px', 
        textAlign: 'center', 
        opacity: 0.6, 
        fontSize: '12px',
        borderTop: '1px solid rgba(255,255,255,0.1)' 
      }}>
        <p>© 2026 ChessPlan - Todos os direitos reservados</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
          <span onClick={() => navigate('/termos')} style={{ cursor: 'pointer', color: '#c4a74a' }}>Termos de Uso</span>
<span onClick={() => navigate('/privacidade')} style={{ cursor: 'pointer', color: '#c4a74a' }}>Privacidade</span>
<span onClick={() => navigate('/reembolso')} style={{ cursor: 'pointer', color: '#c4a74a' }}>Reembolso</span>
        </div>
      </footer>

    </div> 
  );
}