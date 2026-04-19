import { getTokens, setTokens, clearTokens, authenticatedFetch, refreshAccessToken } from './api';
import { API_BASE_URL } from './config';

const USER_PROFILE_KEY = 'auth_user_profile';

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
  password?: string;
  otp: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  country?: string;
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
    case_number?: string;
    tracking_otp?: string;
    tracking_otp_expires_in_minutes?: number;
    next_step?: string;
    track_url?: string;
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

interface CheckUserExistsResponse {
  status: string;
  message: string;
  data: {
    exists: boolean;
  };
  timestamp: string;
}

interface RequestSignupOtpResponse {
  status: string;
  message: string;
  data: {
    email: string;
    otp_expires_in_minutes: number;
    otp?: string;
    prefill?: {
      full_name?: string;
      mobile_number?: string;
      country_of_residence?: string;
    };
  };
  timestamp: string;
}

interface RequestLoginOtpResponse {
  status: string;
  message: string;
  data: {
    email: string;
    otp_expires_in_minutes: number;
    otp?: string;
  };
  timestamp: string;
}

const extractTokens = (payload: unknown): AuthTokens | null => {
  const data = payload as {
    data?: { tokens?: { access?: string; refresh?: string }; access?: string; refresh?: string };
    tokens?: { access?: string; refresh?: string };
    access?: string;
    refresh?: string;
  };

  const access =
    data?.data?.tokens?.access ||
    data?.data?.access ||
    data?.tokens?.access ||
    data?.access ||
    '';
  const refresh =
    data?.data?.tokens?.refresh ||
    data?.data?.refresh ||
    data?.tokens?.refresh ||
    data?.refresh ||
    '';

  const normalizedAccess = typeof access === 'string' ? access.trim() : '';
  const normalizedRefresh = typeof refresh === 'string' ? refresh.trim() : '';

  if (!normalizedAccess || normalizedAccess === 'undefined' || normalizedAccess === 'null') {
    return null;
  }

  return {
    access: normalizedAccess,
    refresh: normalizedRefresh,
  };
};

const getStoredUserProfile = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    localStorage.removeItem(USER_PROFILE_KEY);
    return null;
  }
};

const setStoredUserProfile = (user: UserProfile) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
};

const clearStoredUserProfile = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_PROFILE_KEY);
};

/**
 * Authentication service for FlyOCI
 * Handles login, registration, logout, and user profile management
 */
export const authService = {
  getCachedUser(): UserProfile | null {
    return getStoredUserProfile();
  },

  clearCachedUser(): void {
    clearStoredUserProfile();
  },

  clearLocalSession(): void {
    clearStoredUserProfile();
  },

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

      const tokens = extractTokens(data);
      if (!tokens) {
        throw new Error('Registration failed. Missing auth token payload.');
      }

      // Store tokens
      setTokens(tokens.access, tokens.refresh);
      setStoredUserProfile(data.data.user);

      return { data: { ...data.data, tokens } };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Request OTP for new user signup
   */
  async requestSignupOtp(payload: {
    email: string;
    fullName: string;
    mobileNumber: string;
    countryOfResidence: string;
  }): Promise<{ otpExpiresInMinutes: number; otp?: string; prefill?: { fullName?: string; mobileNumber?: string; countryOfResidence?: string } }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-signup-otp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: payload.email,
          full_name: payload.fullName,
          mobile_number: payload.mobileNumber,
          country_of_residence: payload.countryOfResidence,
        }),
      });

      const data: RequestSignupOtpResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request signup OTP');
      }

      return {
        otpExpiresInMinutes: data.data?.otp_expires_in_minutes ?? 10,
        otp: data.data?.otp,
        prefill: data.data?.prefill
          ? {
              fullName: data.data.prefill.full_name,
              mobileNumber: data.data.prefill.mobile_number,
              countryOfResidence: data.data.prefill.country_of_residence,
            }
          : undefined,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Request OTP for passwordless login
   */
  async requestLoginOtp(email: string): Promise<{ otpExpiresInMinutes: number; otp?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/request-otp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data: RequestLoginOtpResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request login OTP');
      }

      return {
        otpExpiresInMinutes: data.data?.otp_expires_in_minutes ?? 10,
        otp: data.data?.otp,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify OTP login and create session tokens
   */
  async verifyLoginOtp(payload: {
    email: string;
    otp: string;
  }): Promise<{ data: { user: UserProfile; tokens: AuthTokens } }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/verify-otp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const tokens = extractTokens(data);
      if (!tokens) {
        throw new Error('Login failed. Missing auth token payload.');
      }

      setTokens(tokens.access, tokens.refresh);

      setStoredUserProfile(data.data.user);

      return { data: { ...data.data, tokens } };
    } catch (error) {
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

      const tokens = extractTokens(data);
      if (!tokens) {
        throw new Error('Login failed. Missing auth token payload.');
      }

      // Store tokens
      setTokens(tokens.access, tokens.refresh);
      setStoredUserProfile(data.data.user);

      return { data: { ...data.data, tokens } };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if an account already exists for an email address
   */
  async checkUserExists(email: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/check-user/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data: CheckUserExistsResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to check account');
      }

      return Boolean(data.data?.exists);
    } catch (error) {
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
    } finally {
      // Always clear tokens locally
      clearTokens();
      clearStoredUserProfile();
    }
  },

  /**
   * Get current user profile
   * Requires authentication
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const { access, refresh } = getTokens();

      if (!access) {
        if (!refresh) {
          clearStoredUserProfile();
          throw new Error('No active session. Please log in.');
        }

        const refreshedAccess = await refreshAccessToken();
        if (!refreshedAccess) {
          clearStoredUserProfile();
          throw new Error('Session expired. Please log in again.');
        }
      }

      const response = await authenticatedFetch(`${API_BASE_URL}/auth/me/`);

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredUserProfile();
          throw new Error('Session expired. Please log in again.');
        }
        clearStoredUserProfile();
        throw new Error('Failed to fetch user profile');
      }

      const data: UserMeResponse = await response.json();
      setStoredUserProfile(data.data.user);
      return data.data.user;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if user is currently logged in
   */
  isLoggedIn(): boolean {
    const { access, refresh } = getTokens();
    return !!(access || refresh);
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
      throw error;
    }
  },

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string): Promise<{
    data: {
      user: UserProfile;
      tokens: AuthTokens;
      case_number?: string;
      tracking_otp?: string;
      tracking_otp_expires_in_minutes?: number;
      next_step?: string;
      resume_url?: string;
      track_url?: string;
      registration_prefill?: {
        visaDuration?: "1-Year" | "5-Year";
        email?: string;
        confirmEmail?: string;
        countryCode?: string;
        phone?: string;
        fullName?: string;
        nationality?: string;
        countryOfResidence?: string;
        purposeOfVisit?: "Tourism" | "Business" | "Medical" | "Conference" | "Other" | "";
        consent?: boolean;
        minimalPrefillOnly?: boolean;
      };
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/magic-link/verify/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ magic_link: token }),
      });
      const raw = await response.text();
      let data: AuthResponse | null = null;
      try {
        data = raw ? JSON.parse(raw) as AuthResponse : null;
      } catch {
        if (!response.ok) {
          throw new Error(`Magic link verification failed (HTTP ${response.status}).`);
        }
        throw new Error('Magic link verification failed. Invalid server response.');
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Magic link verification failed');
      }

      if (!data) {
        throw new Error('Magic link verification failed. Invalid server response.');
      }

      const tokens = extractTokens(data);
      if (!tokens) {
        throw new Error('Magic link verification failed. Missing token payload.');
      }

      // Store tokens
      setTokens(tokens.access, tokens.refresh);
      setStoredUserProfile(data.data.user);

      return { data: { ...data.data, tokens } };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Request OTP for password reset (forgot password flow)
   */
  async requestForgotPasswordOtp(email: string): Promise<{ otpExpiresInMinutes: number; otp?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/request-otp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request password reset OTP');
      }

      return {
        otpExpiresInMinutes: data.data?.otp_expires_in_minutes ?? 10,
        otp: data.data?.otp,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify OTP for password reset (forgot password flow)
   */
  async verifyForgotPasswordOtp(email: string, otp: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-otp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reset password with OTP (forgot password flow)
   */
  async resetPasswordWithOtp(email: string, otp: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Request OTP for changing password (logged-in user)
   */
  async requestChangePasswordOtp(): Promise<{ otpExpiresInMinutes: number; otp?: string; email: string }> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/change-password/request-otp/`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to request change password OTP');
      }

      const data = await response.json();
      return {
        otpExpiresInMinutes: data.data?.otp_expires_in_minutes ?? 10,
        otp: data.data?.otp,
        email: data.data?.email ?? '',
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Change password with OTP (logged-in user)
   */
  async changePassword(otp: string, password: string): Promise<void> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/auth/change-password/confirm/`, {
        method: 'POST',
        body: JSON.stringify({ otp, password }),
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }
    } catch (error) {
      throw error;
    }
  },
};
