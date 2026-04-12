'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, UserProfile, LoginCredentials, RegisterCredentials } from '@/lib/auth';
interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSessionExpiredError = (message: string) => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('session expired') ||
      normalized.includes('no active session') ||
      normalized.includes('no access token') ||
      normalized.includes('please log in')
    );
  };

  // Initialize auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

 const checkAuth = async () => {
  try {
    if (authService.isLoggedIn()) {
      const cachedUser = authService.getCachedUser();

      if (cachedUser) {
        setUser(cachedUser); // ✅ KEEP THIS
      }

      try {
        const profile = await authService.getProfile();
        setUser(profile); // ✅ update if success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "";
        if (isSessionExpiredError(errorMessage)) {
          authService.clearLocalSession();
          setUser(null);
          setError('Session expired. Please log in again.');
        } else {
          console.warn("Profile fetch failed, using cached user");
        }
      }

    } else {
      authService.clearCachedUser();
      setUser(null);
    }
  } catch (err) {
    console.error('Auth check failed:', err);
  } finally {
    setLoading(false);
  }
};

  const login = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.login(credentials);
      setUser(response.data.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.register(credentials);
      setUser(response.data.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setLoading(true);
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setUser(null); // Clear user anyway
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      setError(null);
      if (authService.isLoggedIn()) {
        const profile = await authService.getProfile();
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh user';
      if (isSessionExpiredError(errorMessage)) {
        authService.clearLocalSession();
        setError('Session expired. Please log in again.');
      } else {
        setError(errorMessage);
      }
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
