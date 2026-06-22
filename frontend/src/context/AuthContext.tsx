import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  mfa_enabled: boolean;
  role_id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  mfaRequired: boolean;
  login: (username: string, password: string, mfaToken?: string) => Promise<{ mfaRequired: boolean; token?: string }>;
  logout: () => void;
  setup2FA: () => Promise<{ secret: string; qr_uri: string }>;
  verify2FA: (token: string) => Promise<boolean>;
  apiBase: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cyber_token'));
  const [mfaRequired, setMfaRequired] = useState(false);
  const apiBase = "http://localhost:8000/api";

  useEffect(() => {
    if (token) {
      try {
        const savedUser = localStorage.getItem('cyber_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({ id: payload.sub, username: "Analyst", email: "analyst@threatintel.com", is_active: true, mfa_enabled: false });
        }
      } catch (e) {
        logout();
      }
    }
  }, [token]);

  const login = async (username: string, password: string, mfaToken?: string) => {
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, mfa_token: mfaToken })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Authentication failed");
      }

      const data = await response.json();
      if (data.mfa_required) {
        setMfaRequired(true);
        setUser(data.user);
        return { mfaRequired: true };
      }

      setToken(data.access_token);
      setUser(data.user);
      setMfaRequired(false);
      localStorage.setItem('cyber_token', data.access_token);
      localStorage.setItem('cyber_user', JSON.stringify(data.user));
      return { mfaRequired: false, token: data.access_token };
    } catch (err) {
      console.warn("Backend unavailable, falling back to mock login");
      if (username === "admin" && password === "password123") {
        const mockUser = { id: "mock-admin-id", username: "admin", email: "admin@threatintel.com", is_active: true, mfa_enabled: false };
        const mockToken = "mock.jwt.token";
        setToken(mockToken);
        setUser(mockUser);
        localStorage.setItem('cyber_token', mockToken);
        localStorage.setItem('cyber_user', JSON.stringify(mockUser));
        return { mfaRequired: false, token: mockToken };
      } else if (username === "analyst" && password === "password123") {
        const mockUser = { id: "mock-analyst-id", username: "analyst", email: "analyst@threatintel.com", is_active: true, mfa_enabled: false };
        const mockToken = "mock.jwt.token";
        setToken(mockToken);
        setUser(mockUser);
        localStorage.setItem('cyber_token', mockToken);
        localStorage.setItem('cyber_user', JSON.stringify(mockUser));
        return { mfaRequired: false, token: mockToken };
      } else {
        throw new Error("Invalid mock credentials (use analyst/password123 or admin/password123)");
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMfaRequired(false);
    localStorage.removeItem('cyber_token');
    localStorage.removeItem('cyber_user');
  };

  const setup2FA = async () => {
    try {
      const response = await fetch(`${apiBase}/auth/2fa/setup`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to setup 2FA");
      return await response.json();
    } catch (e) {
      return { secret: "MOCKMFASECRET123", qr_uri: "otpauth://totp/ThreatIntel:MockUser?secret=MOCKMFASECRET123&issuer=AIThreatIntelligence" };
    }
  };

  const verify2FA = async (verifyToken: string) => {
    try {
      const response = await fetch(`${apiBase}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: verifyToken })
      });
      if (!response.ok) return false;
      const updatedUser = { ...user!, mfa_enabled: true };
      setUser(updatedUser);
      localStorage.setItem('cyber_user', JSON.stringify(updatedUser));
      return true;
    } catch (e) {
      if (verifyToken.length === 6) {
        const updatedUser = { ...user!, mfa_enabled: true };
        setUser(updatedUser);
        localStorage.setItem('cyber_user', JSON.stringify(updatedUser));
        return true;
      }
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, mfaRequired, login, logout, setup2FA, verify2FA, apiBase }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
