import React, { useEffect, useState } from 'react';

interface AttackArc {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  severity: string;
}

export const ThreatMap: React.FC<{ threats: any[] }> = ({ threats }) => {
  const [arcs, setArcs] = useState<AttackArc[]>([]);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // Map geographic coords (lat, lon) to SVG viewBox (800 x 400)
  const mapCoords = (lat: number, lon: number) => {
    const x = ((lon + 180) * 800) / 360;
    const y = ((90 - lat) * 400) / 180;
    return { x, y };
  };

  // Predefined SOC base coordinates (Target hub: US)
  const targetHub = mapCoords(37.0902, -95.7129); // US Center

  useEffect(() => {
    if (threats.length === 0) return;

    // Filter threats with geolocations
    const geoThreats = threats.filter(t => t.latitude && t.longitude && t.country !== "United States");
    if (geoThreats.length === 0) return;

    // Take the latest threat and create an attack arc
    const latest = geoThreats[0];
    const sourceCoords = mapCoords(latest.latitude, latest.longitude);
    
    const newArc: AttackArc = {
      id: `${latest.id}-${Date.now()}`,
      startX: sourceCoords.x,
      startY: sourceCoords.y,
      endX: targetHub.x,
      endY: targetHub.y,
      severity: latest.severity
    };

    setArcs(prev => [...prev.slice(-8), newArc]); // Keep last 9 arcs
    setActiveAlert(latest.title);

    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [threats]);

  // Pre-seed some land dots for a holographic cyber look
  const landGrid = [
    { lat: 40, lon: -100 }, { lat: 35, lon: -115 }, { lat: 45, lon: -90 }, { lat: 30, lon: -95 }, // North America
    { lat: 55, lon: -3 }, { lat: 51, lon: 10 }, { lat: 48, lon: 2 }, { lat: 46, lon: 25 }, // Europe
    { lat: 35, lon: 104 }, { lat: 40, lon: 116 }, { lat: 22, lon: 114 }, { lat: 31, lon: 121 }, // China/East Asia
    { lat: 61, lon: 105 }, { lat: 55, lon: 37 }, { lat: 56, lon: 92 }, { lat: 62, lon: 129 }, // Russia
    { lat: 20, lon: 78 }, { lat: 13, lon: 80 }, { lat: 28, lon: 77 }, // India
    { lat: -14, lon: -51 }, { lat: -23, lon: -46 }, { lat: -8, lon: -35 }, // South America
    { lat: -25, lon: 133 }, { lat: -33, lon: 151 }, // Australia
    { lat: 9, lon: 19 }, { lat: -1, lon: 36 }, { lat: -25, lon: 28 }, // Africa
  ];

  return (
    <div className="w-full h-full flex flex-col relative bg-cyber-card/40 cyber-glass rounded-xl p-4 overflow-hidden border border-white/5">
      {/* SCANNER OVERLAY */}
      <div className="absolute inset-0 cyber-scanner opacity-[0.03] pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-4 z-10">
        <div>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-cyber-primary">Live Cyber Attack Map</h3>
          <p className="text-xs text-cyber-muted">Real-time ingestion flow arcs to Security Operation Center</p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-cyber-secondary animate-pulse" />
          <span className="text-cyber-muted uppercase tracking-widest font-mono">SOC Active</span>
        </div>
      </div>

      {/* MAP CANVAS */}
      <div className="flex-1 w-full relative flex items-center justify-center">
        <svg viewBox="0 0 800 400" className="w-full h-auto select-none">
          {/* Graticule / Grid lines */}
          <path d="M 0,100 L 800,100 M 0,200 L 800,200 M 0,300 L 800,300" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <path d="M 200,0 L 200,400 M 400,0 L 400,400 M 600,0 L 600,400" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

          {/* World land coordinates dots (Holographic Cyber Grid) */}
          {landGrid.map((p, idx) => {
            const coords = mapCoords(p.lat, p.lon);
            return (
              <circle
                key={`land-${idx}`}
                cx={coords.x}
                cy={coords.y}
                r="3"
                className="fill-cyber-text/10"
              />
            );
          })}

          {/* Destination target glow (SOC Center) */}
          <circle cx={targetHub.x} cy={targetHub.y} r="15" className="fill-cyber-primary/10 stroke-cyber-primary/20 stroke-1 animate-ping" />
          <circle cx={targetHub.x} cy={targetHub.y} r="6" className="fill-cyber-primary shadow-cyan-glow" />

          {/* Active attack sources and animated arcs */}
          {arcs.map((arc) => {
            // Bezier curve control point (creates curved arc)
            const midX = (arc.startX + arc.endX) / 2;
            const midY = Math.min(arc.startY, arc.endY) - 80;
            const pathData = `M ${arc.startX} ${arc.startY} Q ${midX} ${midY} ${arc.endX} ${arc.endY}`;
            
            const isCritical = arc.severity === "CRITICAL";
            const strokeColor = isCritical ? '#FF4D6D' : arc.severity === "HIGH" ? '#7B61FF' : '#00E5FF';
            const shadowClass = isCritical ? 'shadow-red-glow' : arc.severity === "HIGH" ? 'shadow-purple-glow' : 'shadow-cyan-glow';

            return (
              <g key={arc.id}>
                {/* Attack Origin Pulse */}
                <circle cx={arc.startX} cy={arc.startY} r="8" className="fill-transparent stroke-1 animate-ping" style={{ stroke: strokeColor }} />
                <circle cx={arc.startX} cy={arc.startY} r="4" style={{ fill: strokeColor }} />

                {/* Core Bezier Arc Curve */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  strokeDasharray="4 4"
                />

                {/* Flowing Laser Attack Stream */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  className={shadowClass}
                  strokeDasharray="30 150"
                  strokeDashoffset="180"
                  style={{
                    animation: 'dash 2.5s linear infinite',
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* CSS for arc laser beam flow */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes dash {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}} />

        {/* REALTIME SYSTEM FLOATER NOTIFICATION */}
        {activeAlert && (
          <div className="absolute bottom-4 left-4 right-4 bg-cyber-bg/95 border border-cyber-danger/35 px-3 py-2 rounded shadow-red-glow flex items-center justify-between transition-all duration-300 animate-bounce z-10">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-danger animate-threat-pulse" />
              <span className="text-xs font-mono text-cyber-danger font-semibold uppercase">Intrusion Detected:</span>
              <span className="text-xs text-cyber-text truncate max-w-[250px] font-mono">{activeAlert}</span>
            </div>
            <span className="text-[10px] text-cyber-muted font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded">Seeding Map</span>
          </div>
        )}
      </div>
    </div>
  );
};
