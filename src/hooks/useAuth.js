import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const SESSION_DURATION = 10 * 60 * 60 * 1000; // 10 horas

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('vtx_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const now = new Date().getTime();
        if (now - session.loginTime < SESSION_DURATION) {
          setIsAuthenticated(true);
          setUser(session.user);
        } else {
          localStorage.removeItem('vtx_session');
        }
      } catch (e) {
        localStorage.removeItem('vtx_session');
      }
    }
  }, []);

  const login = (email, userData) => {
    const sessionData = {
      email,
      user: userData,
      loginTime: new Date().getTime()
    };
    localStorage.setItem('vtx_session', JSON.stringify(sessionData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('vtx_session');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}