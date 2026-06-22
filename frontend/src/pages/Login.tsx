import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Key, ShieldCheck, Cpu } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, mfaRequired } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password, mfaRequired ? mfaToken : undefined);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'analyst') => {
    setUsername(role);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-cyber-bg overflow-hidden p-4">
      {/* FLOATING CYBER PARTICLES BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg className="w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          {/* Animated floating grids & nodes */}
          <circle cx="10%" cy="20%" r="4" fill="#00E5FF" className="animate-pulse" />
          <circle cx="80%" cy="15%" r="6" fill="#7B61FF" className="animate-pulse" style={{ animationDelay: '1s' }} />
          <circle cx="30%" cy="75%" r="3" fill="#00FF88" className="animate-pulse" style={{ animationDelay: '2s' }} />
          <circle cx="75%" cy="80%" r="5" fill="#FF4D6D" className="animate-pulse" style={{ animationDelay: '3s' }} />
          <line x1="10%" y1="20%" x2="30%" y2="75%" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="80%" y1="15%" x2="75%" y2="80%" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>
      </div>

      {/* LOGIN CARD */}
      <div className="w-full max-w-md bg-cyber-card/60 cyber-glass rounded-2xl p-8 border border-white/10 shadow-cyan-glow relative z-10 font-mono">
        {/* scanner swipe */}
        <div className="absolute inset-0 cyber-scanner opacity-[0.03] pointer-events-none rounded-2xl" />

        {/* LOGO */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-cyber-primary/10 border border-cyber-primary/30 items-center justify-center text-cyber-primary mb-3 shadow-cyan-glow animate-bounce">
            <Cpu size={26} />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-widest text-cyber-primary">Threat Intel Platform</h2>
          <p className="text-xs text-cyber-muted mt-1 uppercase">SaaS Security Gateway</p>
        </div>

        {error && (
          <div className="mb-4 bg-cyber-danger/10 border border-cyber-danger/30 text-cyber-danger p-3 rounded text-xs text-center font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!mfaRequired ? (
            <>
              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-cyber-muted font-bold">User Identity</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-cyber-muted" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter security handle..."
                    className="w-full bg-cyber-bg border border-white/10 rounded pl-10 pr-4 py-2.5 text-xs text-cyber-text focus:outline-none focus:border-cyber-primary focus:shadow-cyan-glow transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-cyber-muted font-bold">Access Cipher</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-cyber-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter cryptographic key..."
                    className="w-full bg-cyber-bg border border-white/10 rounded pl-10 pr-4 py-2.5 text-xs text-cyber-text focus:outline-none focus:border-cyber-primary focus:shadow-cyan-glow transition-all"
                  />
                </div>
              </div>
            </>
          ) : (
            /* MFA Verification Subform */
            <div className="space-y-3 animate-pulse">
              <div className="text-center p-2 border border-cyber-accent/30 bg-cyber-accent/10 rounded mb-2">
                <ShieldCheck className="mx-auto text-cyber-accent mb-1" size={24} />
                <span className="text-[10px] uppercase font-bold text-cyber-accent">Multi-Factor Active</span>
                <p className="text-[9px] text-cyber-muted mt-1 leading-relaxed">Enter Google Authenticator OTP code to decrypt session token.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-cyber-muted font-bold">OTP Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4.5 w-4.5 text-cyber-muted" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full bg-cyber-bg border border-white/10 rounded pl-10 pr-4 py-2.5 text-xs text-cyber-text focus:outline-none focus:border-cyber-accent focus:shadow-purple-glow transition-all tracking-[0.3em] font-bold text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded text-xs font-bold uppercase tracking-widest text-cyber-bg transition-all mt-6 shadow-cyan-glow flex justify-center items-center ${mfaRequired ? 'bg-cyber-accent text-white shadow-purple-glow' : 'bg-cyber-primary hover:bg-cyber-primary/80'}`}
          >
            {loading ? (
              <span className="border-2 border-cyber-bg border-t-transparent w-4 h-4 rounded-full animate-spin" />
            ) : mfaRequired ? (
              "Decrypt Session"
            ) : (
              "Authorize Session"
            )}
          </button>
        </form>

        {/* DEMO ACCELERATORS */}
        {!mfaRequired && (
          <div className="mt-8 pt-4 border-t border-white/5 text-center">
            <span className="text-[10px] text-cyber-muted uppercase font-bold">Demo Quick Accelerators</span>
            <div className="flex justify-center space-x-2 mt-2.5">
              <button
                onClick={() => handleQuickFill('analyst')}
                className="bg-cyber-primary/10 hover:bg-cyber-primary/20 border border-cyber-primary/30 text-cyber-primary px-2.5 py-1.5 rounded text-[10px] transition-all"
              >
                Analyst Account
              </button>
              <button
                onClick={() => handleQuickFill('admin')}
                className="bg-cyber-accent/10 hover:bg-cyber-accent/20 border border-cyber-accent/30 text-cyber-accent px-2.5 py-1.5 rounded text-[10px] transition-all"
              >
                Admin Account
              </button>
            </div>
            <p className="text-[9px] text-cyber-muted mt-2 italic">Credentials: username / password123</p>
          </div>
        )}
      </div>
    </div>
  );
};
