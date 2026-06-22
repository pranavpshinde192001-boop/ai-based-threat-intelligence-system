import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Cpu, Server, Globe, User, Activity } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: 'search' | 'actor' | 'malware' | 'ip' | 'server';
  x: number;
  y: number;
}

interface Link {
  source: string;
  target: string;
}

export const ThreatExplorer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('185.112.144.1');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Generate relationship graph on search
  const generateGraph = (query: string) => {
    // Basic deterministic mapping based on string code
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      hash = query.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const actors = ["APT29 (Cozy Bear)", "APT28 (Fancy Bear)", "Lazarus Group", "LockBit 3.0", "Wizard Spider"];
    const malwares = ["Cobalt Strike", "RedLine Stealer", "BlackCat", "Qakbot", "Emotet"];
    const ips = ["193.161.193.99", "185.220.101.5", "91.240.118.22", "103.20.112.4"];
    const servers = ["HR-Database-SRV", "Corp-AD-Controller", "Web-Gateway-Edge", "Mail-Exchanger-Exchange"];

    const selectedActor = actors[hash % actors.length];
    const selectedMalware = malwares[hash % malwares.length];
    const selectedIp = ips[hash % ips.length];
    const selectedServer = servers[hash % servers.length];

    // Node coords: 0 is center (250, 200)
    const newNodes: Node[] = [
      { id: 'center', label: query, type: 'search', x: 250, y: 200 },
      { id: 'actor', label: selectedActor, type: 'actor', x: 120, y: 100 },
      { id: 'malware', label: selectedMalware, type: 'malware', x: 380, y: 100 },
      { id: 'ip', label: selectedIp, type: 'ip', x: 130, y: 300 },
      { id: 'server', label: selectedServer, type: 'server', x: 370, y: 300 },
    ];

    const newLinks: Link[] = [
      { source: 'center', target: 'actor' },
      { source: 'center', target: 'malware' },
      { source: 'center', target: 'ip' },
      { source: 'center', target: 'server' },
      { source: 'actor', target: 'malware' },
    ];

    setNodes(newNodes);
    setLinks(newLinks);
    setSelectedNode(newNodes[0]);
  };

  useEffect(() => {
    generateGraph(searchQuery);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      generateGraph(searchQuery);
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'search': return '#00E5FF'; // Cyber cyan
      case 'actor': return '#FF4D6D';  // Threat Red
      case 'malware': return '#7B61FF'; // Purple
      case 'ip': return '#00FF88';      // Neon Green
      default: return '#94A3B8';
    }
  };

  const getNodeIcon = (type: string) => {
    const size = 16;
    switch (type) {
      case 'search': return <ShieldAlert size={size} className="text-cyber-primary" />;
      case 'actor': return <User size={size} className="text-cyber-danger" />;
      case 'malware': return <Cpu size={size} className="text-cyber-accent" />;
      case 'ip': return <Globe size={size} className="text-cyber-secondary" />;
      default: return <Server size={size} className="text-cyber-muted" />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-cyber-card/40 cyber-glass rounded-xl p-4 border border-white/5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-cyber-primary">Threat Relationship Explorer</h3>
        <p className="text-xs text-cyber-muted">Search indicators to map threat groups, files, and compromised nodes</p>
      </div>

      {/* SEARCH BAR */}
      <form onSubmit={handleSearch} className="flex space-x-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-cyber-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IP, Domain, Hash or CVE ID..."
            className="w-full bg-cyber-bg/70 border border-white/10 rounded pl-9 pr-4 py-2 text-sm text-cyber-text focus:outline-none focus:border-cyber-primary focus:shadow-cyan-glow transition-all"
          />
        </div>
        <button
          type="submit"
          className="bg-cyber-primary hover:bg-cyber-primary/80 text-cyber-bg font-semibold text-sm px-4 py-2 rounded transition-all shadow-cyan-glow"
        >
          Explore
        </button>
      </form>

      {/* CANVAS & SIDE DETAIL PANE */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-[350px]">
        {/* GRAPH WINDOW */}
        <div className="flex-1 bg-cyber-bg/50 border border-white/5 rounded relative flex items-center justify-center overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 500 400" style={{ minHeight: '350px' }}>
            {/* Draw Links */}
            {links.map((link, idx) => {
              const src = nodes.find(n => n.id === link.source);
              const tgt = nodes.find(n => n.id === link.target);
              if (!src || !tgt) return null;
              return (
                <line
                  key={`link-${idx}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              );
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const color = getNodeColor(node.type);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedNode(node)}
                >
                  {/* Outer Ring Glow */}
                  <circle
                    r={isSelected ? 26 : 20}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeOpacity={isSelected ? 0.9 : 0.4}
                    className="transition-all duration-300 group-hover:scale-110"
                    style={{ filter: isSelected ? `drop-shadow(0 0 8px ${color})` : 'none' }}
                  />
                  {/* Inner Node */}
                  <circle
                    r="15"
                    fill="#121A2E"
                    stroke={color}
                    strokeWidth="1"
                  />
                  {/* Node Type Label */}
                  <text
                    y="36"
                    textAnchor="middle"
                    className="text-[10px] font-mono tracking-wider fill-cyber-text/80 font-bold pointer-events-none uppercase"
                  >
                    {node.label.length > 15 ? `${node.label.substring(0, 12)}...` : node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* FLOAT NODES CAPTION */}
          <div className="absolute top-2 left-2 flex space-x-2 text-[9px] font-mono bg-cyber-bg/85 px-2 py-1 rounded border border-white/5">
            <span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-cyber-primary" /> <span>IOC</span></span>
            <span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-cyber-danger" /> <span>Actor</span></span>
            <span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-cyber-accent" /> <span>File</span></span>
            <span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-cyber-secondary" /> <span>IP</span></span>
          </div>
        </div>

        {/* SIDE DETAIL DETAILS */}
        <div className="w-full md:w-60 bg-cyber-card/65 border border-white/5 rounded p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-white/5 pb-2 mb-3">
              <Activity size={15} className="text-cyber-primary" />
              <h4 className="text-xs uppercase font-bold tracking-widest font-mono text-cyber-primary">Node Registry</h4>
            </div>

            {selectedNode ? (
              <div className="space-y-3 font-mono">
                <div>
                  <div className="text-[10px] text-cyber-muted uppercase">Object Type</div>
                  <div className="text-xs font-semibold uppercase text-cyber-text flex items-center space-x-1.5 mt-0.5">
                    {getNodeIcon(selectedNode.type)}
                    <span>{selectedNode.type}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-cyber-muted uppercase">Indicator Value</div>
                  <div className="text-xs text-cyber-text break-all font-bold select-all">{selectedNode.label}</div>
                </div>
                <div>
                  <div className="text-[10px] text-cyber-muted uppercase">Correlation Scope</div>
                  <div className="text-[11px] text-cyber-muted mt-1 leading-relaxed">
                    {selectedNode.type === 'search' && "Searched threat root. Linked vectors map active egress and intrusion footprints."}
                    {selectedNode.type === 'actor' && "Known Advanced Persistent Threat group flagged by state threat intelligence centers."}
                    {selectedNode.type === 'malware' && "Identified command beacon payload used during initial foothold containment breach."}
                    {selectedNode.type === 'ip' && "Host flagged as command-and-control scan router by border security monitors."}
                    {selectedNode.type === 'server' && "Internal enterprise resource showing active telemetry spikes during incident alert."}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-cyber-muted font-mono italic">Select a node in the network to inspect relationship mapping.</div>
            )}
          </div>

          {selectedNode && (
            <div className="mt-4 pt-2 border-t border-white/5">
              <button
                onClick={() => alert(`Creating security investigation for IOC: ${selectedNode.label}`)}
                className="w-full bg-cyber-primary/10 hover:bg-cyber-primary/20 border border-cyber-primary/30 text-cyber-primary font-mono uppercase text-[10px] font-bold py-1.5 rounded transition-all text-center"
              >
                Isolate IOC & Hunt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
