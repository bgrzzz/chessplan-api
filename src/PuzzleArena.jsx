// ═══════════════════════════════════════════════════════════════════
// PuzzleArena.jsx — Versão Lichess Iframe (Original)
// ═══════════════════════════════════════════════════════════════════
import React from "react";

export function PuzzleArena({ onBack }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
      {/* Cabeçalho da Arena */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, color: "#c4a74a", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧩</span> Arena de Puzzles (Lichess)
          </h2>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            Treino tático usando a base de dados externa do Lichess.org
          </p>
        </div>
        <button onClick={onBack} style={{ 
          background: "rgba(255,255,255,0.05)", color: "white", 
          border: "1px solid rgba(255,255,255,0.1)", padding: "8px 16px", 
          borderRadius: 8, cursor: "pointer", fontWeight: "bold" 
        }}>
          ← Voltar ao Plano
        </button>
      </div>

      {/* Container do Iframe */}
      <div style={{ 
        width: "100%", 
        height: "600px", 
        background: "#1a1b1e", 
        borderRadius: 12, 
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}>
        <iframe 
          src="https://lichess.org/training/frame?theme=brown&bg=dark" 
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Lichess Puzzles"
        ></iframe>
      </div>
      
      {/* Aviso sobre o redirecionamento */}
      <div style={{ 
        marginTop: 16, 
        padding: "12px 20px", 
        background: "rgba(196,167,74,0.05)", 
        borderRadius: 8, 
        border: "1px solid rgba(196,167,74,0.1)" 
      }}>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
          ⚠️ <strong>Nota de Integração:</strong> O Lichess permite visualizar o puzzle, mas ao interagir (clicar ou arrastar), eles redirecionam para o site oficial por questões de segurança e tráfego da plataforma deles.
        </p>
      </div>
    </div>
  );
}