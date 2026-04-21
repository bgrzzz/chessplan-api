// ═══════════════════════════════════════════════════════════════════
// SEO.jsx — Componente de meta tags por página
// Coloque em src/SEO.jsx
// ═══════════════════════════════════════════════════════════════════
import { useEffect } from "react";

export function SEO({ title, description }) {
  useEffect(() => {
    // Title
    document.title = title ? `${title} | ChessPlan` : "ChessPlan — Análise de xadrez com IA";

    // Meta description
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description || "Conecte seu Lichess ou Chess.com e receba análises personalizadas com IA. Cursos interativos, heatmap de erros e opening explorer.");

    // Open Graph
    const setOG = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setOG("og:title", title || "ChessPlan");
    setOG("og:description", description || "Análise de xadrez com IA");
    setOG("og:type", "article");
    setOG("og:url", window.location.href);
    setOG("og:site_name", "ChessPlan");
  }, [title, description]);

  return null;
}
