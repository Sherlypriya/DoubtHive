import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true); // true while we check for an existing session

  // On first load, if a token exists, verify it and fetch the current user
  // instead of trusting whatever was last cached in localStorage.
  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await axiosClient.get('/auth/me');
        setUser(data.user);
      } catch (err) {
        // token invalid/expired — clear everything
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Call this after a successful login/register API response: { user, token }
  const login = ({ user: userData, token: authToken }) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  // Re-fetch the current user (e.g. to pick up new XP). Only updates state when
  // something actually changed, so it doesn't cause needless re-renders.
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const { data } = await axiosClient.get('/auth/me');
      setUser((prev) => (prev && JSON.stringify(prev) === JSON.stringify(data.user) ? prev : data.user));
    } catch { /* keep the current user on transient errors */ }
  }, []);

  const value = {
    user,
    refreshUser,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
