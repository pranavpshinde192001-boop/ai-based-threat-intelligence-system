import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThreatMap } from '../components/map/ThreatMap';
import { ThreatExplorer } from '../components/visualizer/ThreatExplorer';
import { ChatAssistant } from '../components/chat/ChatAssistant';
import { 
  RefreshCw, LogOut, Home, Activity, Bot, Terminal 
} from 'lucide-react';

interface ThreatItem {
  id: string;
  title: string;
  type: string;
  source: string;
  severity: string;
  risk_score: number;
  country: string;
  detected_at: string;
  latitude?: number;
  longitude?: number;
}

export const Dashboard: React.FC = () => {
  const { user, logout, token, apiBase } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'explorer' | 'chat'>('dashboard');
  const [stats, setStats] = useState({
    total_threats: 40,
    critical_threats: 12,
    active_incidents: 3,
    threat_types: { "MALWARE": 15, "DDOS": 10, "PHISHING": 8, "BOTNET": 5, "EXFILTRATION": 2 }
  });
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${apiBase}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Threats/Heatmap
      const mapRes = await fetch(`${apiBase}/dashboard/heat-map`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setThreats(mapData);
      }
    } catch (err) {
      console.warn("API offline, seeding mock dashboard data");
      // MOCK SEED THREAT DATA IF BACKEND UNREACHABLE
      const mockThreats: ThreatItem[] = [
        { id: 't1', title: 'LockBit ransomware command trigger', type: 'MALWARE', source: 'AlienVault OTX', severity: 'CRITICAL', risk_score: 94.5, country: 'Russia', detected_at: new Date().toISOString(), latitude: 61.5, longitude: 105.3 },
        { id: 't2', title: 'Spoofed credential login portal active', type: 'PHISHING', source: 'OpenCTI', severity: 'HIGH', risk_score: 78.2, country: 'China', detected_at: new Date().toISOString(), latitude: 35.8, longitude: 104.1 },
        { id: 't3', title: 'Heavy volumetric SYN flood on DMZ edge', type: 'DDOS', source: 'AbuseIPDB', severity: 'HIGH', risk_score: 82.1, country: 'Netherlands', detected_at: new Date().toISOString(), latitude: 52.1, longitude: 5.2 },
        { id: 't4', title: 'Compromised AD directory account brute force', type: 'BOTNET', source: 'MISP', severity: 'MEDIUM', risk_score: 55.4, country: 'Germany', detected_at: new Date().toISOString(), latitude: 51.1, longitude: 10.4 },
        { id: 't5', title: 'Database exfiltration transfer detected', type: 'EXFILTRATION', source: 'VirusTotal', severity: 'CRITICAL', risk_score: 91.0, country: 'Iran', detected_at: new Date().toISOString(), latitude: 32.4, longitude: 53.6 }
      ];
      setThreats(mockThreats);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFeeds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/feeds/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Threat Feeds synchronized successfully! Feeds loaded from AbuseIPDB, NVD, AlienVault.");
        fetchDashboardData();
      }
    } catch (e) {
      // Mock Sync
      setTimeout(() => {
        const added = {
          id: `sync-${Date.now()}`,
          title: 'New botnet scan signature matches OpenCTI indicators',
          type: 'BOTNET',
          source: 'OpenCTI',
          severity: 'HIGH',
          risk_score: 74.0,
          country: 'Brazil',
          detected_at: new Date().toISOString(),
          latitude: -14.2,
          longitude: -51.9
        };
        setThreats(prev => [added, ...prev]);
        setStats(prev => ({
          ...prev,
          total_threats: prev.total_threats + 1,
          critical_threats: prev.critical_threats + (added.severity === "CRITICAL" ? 1 : 0)
        }));
        setLoading(false);
        alert("Feeds Synced (Mock Mode). Added a new threat event.");
      }, 500);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 12000); // refresh every 12 sec
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex bg-cyber-bg text-cyber-text font-mono relative overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      <div className="w-16 md:w-56 bg-cyber-card/90 border-r border-white/5 flex flex-col justify-between items-center md:items-start py-6 px-3 z-20">
        <div className="w-full">
          {/* LOGO */}
          <div className="flex items-center space-x-2.5 mb-8 px-2">
            <Activity className="text-cyber-primary h-6 w-6 animate-pulse" />
            <span className="hidden md:inline font-bold uppercase tracking-wider text-xs text-cyber-primary">THREAT INTEL</span>
          </div>

          {/* MENU BUTTONS */}
          <nav className="space-y-1.5 w-full">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-xs uppercase font-bold tracking-wider transition-all ${activeTab === 'dashboard' ? 'bg-cyber-primary/10 border border-cyber-primary/30 text-cyber-primary shadow-cyan-glow' : 'text-cyber-muted hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Home size={16} />
              <span className="hidden md:inline">SOC Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-xs uppercase font-bold tracking-wider transition-all ${activeTab === 'explorer' ? 'bg-cyber-primary/10 border border-cyber-primary/30 text-cyber-primary shadow-cyan-glow' : 'text-cyber-muted hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Terminal size={16} />
              <span className="hidden md:inline">IOC Explorer</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-xs uppercase font-bold tracking-wider transition-all ${activeTab === 'chat' ? 'bg-cyber-primary/10 border border-cyber-primary/30 text-cyber-primary shadow-cyan-glow' : 'text-cyber-muted hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              <Bot size={16} />
              <span className="hidden md:inline">AI Cyber Bot</span>
            </button>
          </nav>
        </div>

        {/* LOGOUT */}
        <div className="w-full space-y-2">
          <div className="hidden md:block p-3 rounded bg-white/5 border border-white/5 text-[9px] text-cyber-muted font-bold">
            <div>USER: {user?.username}</div>
            <div className="text-cyber-accent uppercase mt-1">ROLE: {user?.username === 'admin' ? 'Admin' : 'Analyst'}</div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center md:justify-start space-x-3 px-3 py-2 text-cyber-danger hover:bg-cyber-danger/10 border border-transparent hover:border-cyber-danger/30 rounded text-xs font-bold uppercase transition-all"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT SPACE */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 z-10">
        {/* TOP STATUS BAR */}
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-lg font-bold tracking-wider uppercase text-cyber-text">SECURITY OPERATIONS CENTER (SOC)</h1>
            <p className="text-xs text-cyber-muted uppercase mt-0.5">Control Center • Active Monitoring Environment</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSyncFeeds}
              disabled={loading}
              className="bg-cyber-card hover:bg-white/5 border border-white/10 text-cyber-primary hover:text-cyber-primary/80 font-bold uppercase text-[10px] py-1.5 px-3 rounded flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Sync Feeds</span>
            </button>
            <div className="hidden sm:flex items-center space-x-2 bg-cyber-danger/10 border border-cyber-danger/30 px-3 py-1.5 rounded">
              <span className="w-2 h-2 rounded-full bg-cyber-danger animate-ping" />
              <span className="text-[10px] text-cyber-danger font-bold uppercase tracking-wider">DEFCON LEVEL 3</span>
            </div>
          </div>
        </header>

        {/* COMPONENT LOADING SPACE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI METRIC CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Counter 1: Total Threats */}
              <div className="bg-cyber-card/65 border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-cyan-glow relative">
                <span className="text-[10px] text-cyber-muted uppercase font-bold tracking-wider">Indexed Threats</span>
                <span className="text-3xl font-extrabold text-cyber-primary mt-2 font-sans">{stats.total_threats}</span>
                <span className="text-[9px] text-cyber-secondary mt-1 uppercase font-bold">+12% Since Last Sync</span>
              </div>
              {/* Counter 2: Critical Alerts */}
              <div className="bg-cyber-card/65 border border-cyber-danger/25 rounded-xl p-4 flex flex-col justify-between shadow-red-glow relative">
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyber-danger animate-ping" />
                <span className="text-[10px] text-cyber-muted uppercase font-bold tracking-wider">Critical Threats</span>
                <span className="text-3xl font-extrabold text-cyber-danger mt-2 font-sans">{stats.critical_threats}</span>
                <span className="text-[9px] text-cyber-danger mt-1 uppercase font-bold">Action Required</span>
              </div>
              {/* Counter 3: Active Incidents */}
              <div className="bg-cyber-card/65 border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-purple-glow">
                <span className="text-[10px] text-cyber-muted uppercase font-bold tracking-wider">Active Incidents</span>
                <span className="text-3xl font-extrabold text-cyber-accent mt-2 font-sans">{stats.active_incidents}</span>
                <span className="text-[9px] text-cyber-muted mt-1 uppercase font-bold">Assigned to Analysts</span>
              </div>
              {/* Counter 4: Threat Ingest Feeds */}
              <div className="bg-cyber-card/65 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                <span className="text-[10px] text-cyber-muted uppercase font-bold tracking-wider">Active Ingest Feeds</span>
                <span className="text-3xl font-extrabold text-white mt-2 font-sans">6 / 6</span>
                <span className="text-[9px] text-cyber-secondary mt-1 uppercase font-bold">Integrity Level 96%</span>
              </div>
            </div>

            {/* MAP & EVENT LOG WINDOW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map (2 cols) */}
              <div className="lg:col-span-2 h-[380px]">
                <ThreatMap threats={threats} />
              </div>
              {/* AI Expert assistant placeholder (1 col) */}
              <div className="h-[380px]">
                <ChatAssistant />
              </div>
            </div>

            {/* LIVE FEEDS AUDIT TABLE LOG */}
            <div className="bg-cyber-card/50 border border-white/5 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs uppercase font-bold tracking-widest text-cyber-primary">Live Threat Ingestion Log</h3>
                <span className="text-[9px] text-cyber-muted uppercase">Updates continuously • click item to correlate</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-cyber-muted bg-white/5">
                      <th className="p-2.5 uppercase text-[9px] font-bold">Title</th>
                      <th className="p-2.5 uppercase text-[9px] font-bold">Type</th>
                      <th className="p-2.5 uppercase text-[9px] font-bold">Source</th>
                      <th className="p-2.5 uppercase text-[9px] font-bold">Severity</th>
                      <th className="p-2.5 uppercase text-[9px] font-bold text-center">Score</th>
                      <th className="p-2.5 uppercase text-[9px] font-bold">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threats.slice(0, 7).map((t, idx) => {
                      const isCritical = t.severity === "CRITICAL";
                      return (
                        <tr
                          key={t.id || idx}
                          onClick={() => {
                            // Focus graph explorer tab on click
                            setActiveTab('explorer');
                          }}
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <td className="p-2.5 font-semibold text-white truncate max-w-[280px]" title={t.title}>{t.title}</td>
                          <td className="p-2.5 text-cyber-accent text-[10px] font-bold">{t.type}</td>
                          <td className="p-2.5 text-cyber-muted text-[10px]">{t.source}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isCritical ? 'bg-cyber-danger/10 text-cyber-danger border border-cyber-danger/30' : t.severity === "HIGH" ? 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/30' : 'bg-cyber-primary/10 text-cyber-primary border border-cyber-primary/30'}`}>
                              {t.severity}
                            </span>
                          </td>
                          <td className={`p-2.5 text-center font-bold font-sans ${isCritical ? 'text-cyber-danger' : 'text-cyber-text'}`}>{t.risk_score}</td>
                          <td className="p-2.5 text-cyber-muted">{t.country}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="flex-1">
            <ThreatExplorer />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-2xl mx-auto w-full flex-1">
            <ChatAssistant />
          </div>
        )}
      </div>
    </div>
  );
};
