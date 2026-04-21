import { useMemo } from 'react';
import { calculateRivalries } from './utils';

export function Rivalrytracker({ games, onSelectRival, selectedRival }) {
  const rivals = useMemo(() => calculateRivalries(games), [games]);

  if (rivals.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, color: "#fff", marginBottom: 16 }}>⚔️ Rivais Frequentes</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {rivals.map(rival => (
          <div 
            key={rival.name} 
            onClick={() => onSelectRival(rival.name)}
            style={{
              background: selectedRival === rival.name ? "rgba(196,167,74,0.15)" : "rgba(255,255,255,0.03)",
              border: selectedRival === rival.name 
                ? "1px solid rgba(196,167,74,0.4)" 
                : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, 
              padding: 16,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{rival.platform}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#c4a74a", marginBottom: 8 }}>{rival.name}</div>
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span>Placar:</span>
              <span style={{ fontWeight: 600 }}>
                <span style={{ color: "#7fa650" }}>{rival.wins}V</span> / 
                <span style={{ color: "#e85d5d" }}> {rival.losses}D</span>
              </span>
            </div>
            
            <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
              <div style={{ 
                height: "100%", 
                width: `${(rival.wins / rival.total) * 100}%`, 
                background: "#7fa650" 
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}