import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Bot, User, Volume2, Sparkles, Command } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export const ChatAssistant: React.FC = () => {
  const { token, apiBase } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "🤖 **AI Cybersecurity Assistant Online.**\n\nI can analyze IOCs, explain vulnerability CVE vectors, and generate SANS incident containment guides. Ask a security query below or click a template.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Analyze IP 185.112.144.1",
    "Explain CVE-2024-3094 vulnerability",
    "Remediation plan for Ransomware"
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Text-To-Speech Synthesis helper
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Remove markdown chars for cleaner speech
      const cleaned = text.replace(/[*#`_\-]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 1.05;
      window.speechSynthesis.cancel(); // Terminate existing voices
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  // Response typing/streaming simulator
  const streamBotResponse = (fullText: string) => {
    setIsTyping(true);
    let index = 0;
    const intervalTime = 12; // Type speed speed
    
    // Create empty placeholder message
    const botMsgId = `bot-${Date.now()}`;
    setMessages(prev => [...prev, { id: botMsgId, sender: 'bot', text: '', timestamp: new Date() }]);

    const timer = setInterval(() => {
      if (index < fullText.length) {
        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: fullText.substring(0, index + 1) } : m));
        index++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, intervalTime);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${apiBase}/ai/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: textToSend })
      });

      if (!res.ok) throw new Error("API Offline");
      const data = await res.json();
      
      setIsTyping(false);
      streamBotResponse(data.response);
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      // Offline fallback simulation
      setTimeout(() => {
        setIsTyping(false);
        // Standard high fidelity local replies based on triggers
        const query = textToSend.toLowerCase();
        let reply = "";
        let newSugs: string[] = [];

        if (query.includes("cve")) {
          reply = "### 🔍 CVE-2024-3094 Exploit Signature Alert\n\nActive scanner detection identifies malicious payloads. Affected software includes specific XZ Utils compression binaries.\n\n**Containment Steps:**\n- Downgrade system compiler environments.\n- Block command execution logs from sshd daemons.\n- Deploy zero trust gateway routing rules.";
          newSugs = ["Scan for CVE-2024-3094.", "Show SSH firewall configs."];
        } else if (query.includes("ip") || query.includes("185")) {
          reply = "### 🚨 Rogue C2 Hub Investigation\n\nTelemetry reports state this IP belongs to a compromised hosting server in Western Europe. It is distributing malware payload beacons.\n\n**Action Plan:**\n- Inject ingress blocking rules inside perimeter routers.\n- Audit endpoint logs for traffic bound to this destination.";
          newSugs = ["IP blocklist templates.", "Check egress ports status."];
        } else {
          reply = "🛡️ **SOC Expert Playbook Generated**\n\nI recommend auditing target workstation telemetry immediately. Ensure anti-malware engine definitions are updated. Restrict folder execute permissions inside AppData directories.";
          newSugs = ["Analyze IP 185.112.144.1", "Remediation plan for Ransomware"];
        }

        streamBotResponse(reply);
        setSuggestions(newSugs);
      }, 800);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-cyber-card/45 cyber-glass rounded-xl overflow-hidden border border-white/5 font-mono">
      {/* SCANLINE SWEAPER */}
      <div className="absolute inset-0 cyber-scanner opacity-[0.02] pointer-events-none" />

      {/* CHAT HEADER */}
      <div className="bg-cyber-bg/80 px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal size={16} className="text-cyber-primary animate-pulse" />
          <span className="text-xs uppercase font-bold tracking-widest text-cyber-primary">AI Cyber Assistant Terminal</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-secondary animate-pulse" />
          <span className="text-[10px] text-cyber-secondary uppercase">Analyst Link Stable</span>
        </div>
      </div>

      {/* MESSAGE STREAM AREA */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[350px] min-h-[300px]">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-2 max-w-[85%] ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar Icon */}
              <div className={`w-7 h-7 rounded flex items-center justify-center border ${m.sender === 'user' ? 'bg-cyber-primary/10 border-cyber-primary/30 text-cyber-primary' : 'bg-cyber-accent/10 border-cyber-accent/30 text-cyber-accent'}`}>
                {m.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Message Balloon */}
              <div className={`p-3 rounded text-xs leading-relaxed ${m.sender === 'user' ? 'bg-cyber-primary/15 border border-cyber-primary/35 text-cyber-text' : 'bg-cyber-bg/80 border border-white/5 text-cyber-text/90'}`}>
                {/* Parse mini markdown titles */}
                <div className="whitespace-pre-wrap">
                  {m.text.split('\n').map((line, lIdx) => {
                    if (line.startsWith('###')) {
                      return <h4 key={lIdx} className="text-sm font-bold text-cyber-primary mt-2 mb-1">{line.replace('###', '')}</h4>;
                    }
                    if (line.startsWith('**')) {
                      return <strong key={lIdx} className="text-cyber-accent">{line.replace(/\*\*/g, '')}</strong>;
                    }
                    if (line.startsWith('-')) {
                      return <li key={lIdx} className="ml-3 list-disc text-cyber-text/80">{line.replace('-', '')}</li>;
                    }
                    return <p key={lIdx} className="mb-1">{line}</p>;
                  })}
                </div>

                {/* Speech audio synth button */}
                {m.sender === 'bot' && m.text.length > 10 && (
                  <button
                    onClick={() => handleSpeak(m.text)}
                    className="mt-2 text-cyber-muted hover:text-cyber-primary flex items-center space-x-1 text-[10px] transition-colors"
                    title="Synthesize speech"
                  >
                    <Volume2 size={12} />
                    <span>Voice</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* TYPING STATUS */}
        {isTyping && (
          <div className="flex justify-start items-center space-x-2">
            <div className="w-7 h-7 rounded flex items-center justify-center border bg-cyber-accent/10 border-cyber-accent/20 text-cyber-accent">
              <Bot size={14} className="animate-bounce" />
            </div>
            <div className="bg-cyber-bg/70 border border-white/5 p-2 px-3 rounded flex space-x-1.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* RECOMMENDATIONS / TEMPLATES */}
      <div className="px-4 pb-2 flex flex-wrap gap-1.5 bg-cyber-bg/30">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(s)}
            className="text-[10px] bg-cyber-accent/10 hover:bg-cyber-accent/20 border border-cyber-accent/20 hover:border-cyber-accent/40 text-cyber-muted hover:text-cyber-accent px-2 py-1 rounded transition-all flex items-center space-x-1"
          >
            <Sparkles size={8} />
            <span>{s}</span>
          </button>
        ))}
      </div>

      {/* INPUT FORM */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="bg-cyber-bg/90 border-t border-white/5 p-3 flex space-x-2">
        <div className="relative flex-1 flex items-center">
          <Command size={14} className="absolute left-3 text-cyber-muted" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type command or query AI security analyst..."
            className="w-full bg-cyber-bg border border-white/10 rounded pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-cyber-accent text-cyber-text"
          />
        </div>
        <button
          type="submit"
          className="bg-cyber-accent hover:bg-cyber-accent/80 text-white p-2 rounded transition-all shadow-purple-glow"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
