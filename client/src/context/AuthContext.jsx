import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount via stored token or cookie check
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const response = await api.get('/auth/me');
        if (isMounted && response.data?.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        if (isMounted) {
          localStorage.removeItem('token');
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const authenticatedUser = response.data.user;
    const token = response.data.token;
    if (token) {
      localStorage.setItem('token', token);
    }
    setUser(authenticatedUser);
    return authenticatedUser;
  };

  const register = async (formData) => {
    const response = await api.post('/auth/register', formData);
    const registeredUser = response.data.user;
    const token = response.data.token;
    if (token) {
      localStorage.setItem('token', token);
    }
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
