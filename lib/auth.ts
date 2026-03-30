import { getTokens, setTokens, clearTokens, authenticatedFetch } from './api';
import { API_BASE_URL } from './config';

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  last_activity?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

interface AuthTokens {
  access: string;
  refresh: string;
}

interface AuthResponse {
  status: string;
  message: string;
  data: {
    user: UserProfile;
    tokens: AuthTokens;
  };
  timestamp: string;
}

interface UserMeResponse {
  status: string;
  message: string;
  data: {
    user: UserProfile;
  };
  timestamp: string;
}

/**
 * Authentication service for FlyOCI
 * Handles login, registration, logout, and user profile management
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<{ data: { user: UserProfile; tokens: AuthTokens } }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store tokens
      setTokens(data.data.tokens.access, data.data.tokens.refresh);

      return { data: data.data };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ data: { user: UserProfile; tokens: AuthTokens } }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store tokens
      setTokens(data.data.tokens.access, data.data.tokens.refresh);

      return { data: data.data };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      const { refresh } = getTokens();

      if (refresh) {
        await fetch(`${API_BASE_URL}/auth/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear tokens locally
      clearTokens();
    }
  },

  /**
   * Get current user profile
   * Requires authentication
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/me/`);

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data: UserMeResponse = await response.json();
      return data.data.user;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  /**
   * Check if user is currently logged in
   */
  isLoggedIn(): boolean {
    const { access } = getTokens();
    return !!access;
  },

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    const { access } = getTokens();
    return access;
  },

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    const { refresh } = getTokens();
    return refresh;
  },

  /**
   * Request magic link for passwordless login
   */
  async requestMagicLink(email: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/magic-link/request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to request magic link');
      }
    } catch (error) {
      console.error('Magic link request error:', error);
      throw error;
    }
  },

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string): Promise<{ data: { user: UserProfile; tokens: AuthTokens } }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/magic-link/verify/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Magic link verification failed');
      }

      // Store tokens
      setTokens(data.data.tokens.access, data.data.tokens.refresh);

      return { data: data.data };
    } catch (error) {
      console.error('Magic link verification error:', error);
      throw error;
    }
  },
};
