import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiUrl, api } from '../services/api';
import { triggerGoogleSignIn } from '../services/googleAuthService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Purge any stale persistent user session from localStorage so visiting the site opens as guest
    try {
      localStorage.removeItem('nmd_user');
      localStorage.removeItem('nmd_jwt_token');
    } catch (e) {}

    const saved = sessionStorage.getItem('nmd_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem('nmd_jwt_token') || '';
    } catch (e) {
      return '';
    }
  });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem('nmd_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('nmd_user');
        localStorage.removeItem('nmd_user');
      }
    } catch (e) {}
  }, [user]);

  useEffect(() => {
    try {
      if (token) {
        sessionStorage.setItem('nmd_jwt_token', token);
      } else {
        sessionStorage.removeItem('nmd_jwt_token');
        localStorage.removeItem('nmd_jwt_token');
      }
    } catch (e) {}
  }, [token]);

  // On initial mount, verify token validity with backend if present in session
  useEffect(() => {
    const storedToken = sessionStorage.getItem('nmd_jwt_token');
    if (!storedToken) return;

    let isMounted = true;
    const verifySession = async () => {
      try {
        setIsValidating(true);
        const res = await fetch(getApiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.success && data.user) {
            setUser(data.user);
          } else if (res.status === 401 || data.code === 'TOKEN_EXPIRED') {
            console.warn('JWT session expired or invalid. Logging out.');
            setUser(null);
            setToken('');
            sessionStorage.removeItem('nmd_user');
            sessionStorage.removeItem('nmd_jwt_token');
            localStorage.removeItem('nmd_user');
            localStorage.removeItem('nmd_jwt_token');
          }
        }
      } catch (err) {
        console.warn('Session verification network error:', err);
      } finally {
        if (isMounted) setIsValidating(false);
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  const getAuthHeaders = useCallback((customHeaders = {}) => {
    const currentToken = token || sessionStorage.getItem('nmd_jwt_token');
    const auth = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
    return { ...auth, ...customHeaders };
  }, [token]);

  const login = async (identifier, password) => {
    const trimmed = (identifier || '').trim();
    if (!trimmed || typeof password !== 'string' || !password || password.length > 128) {
      return { success: false, message: 'Enter your registered email/mobile number and password.' };
    }
    try {
      const res = await api.post('/api/auth/login', {
        identifier: trimmed,
        mobile: trimmed,
        email: trimmed,
        password,
      });
      const data = await res.json();
      if (res.ok && data.success && data.user && data.token) {
        setUser(data.user);
        sessionStorage.setItem('nmd_user', JSON.stringify(data.user));
        setToken(data.token);
        sessionStorage.setItem('nmd_jwt_token', data.token);
        return { success: true, user: data.user, token: data.token };
      } else {
        return { success: false, message: data.message || 'Invalid credentials' };
      }
    } catch (err) {
      console.error('API login failed:', err);
      return { success: false, message: 'Unable to reach the sign-in service. Please try again.' };
    }
  };

  const register = async (formData) => {
    try {
      const res = await api.post('/api/auth/register', formData);
      const data = await res.json();
      if (data.success && data.user && data.token) {
        setUser(data.user);
        setToken(data.token);
        sessionStorage.setItem('nmd_user', JSON.stringify(data.user));
        sessionStorage.setItem('nmd_jwt_token', data.token);
        return { success: true, user: data.user, token: data.token };
      } else {
        return {
          success: false,
          message: data.message || 'Registration did not return a valid customer account. Please try again.',
        };
      }
    } catch (err) {
      console.warn('API registration error:', err);
      return {
        success: false,
        message: 'Unable to reach the registration service. Please try again when the server is available.',
      };
    }
  };

  const [pendingGoogleAuth, setPendingGoogleAuthState] = useState(() => {
    try {
      const stored = sessionStorage.getItem('nmd_pending_google_auth');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const savePendingGoogleAuth = (data) => {
    setPendingGoogleAuthState(data);
    if (data) {
      sessionStorage.setItem('nmd_pending_google_auth', JSON.stringify(data));
    } else {
      sessionStorage.removeItem('nmd_pending_google_auth');
    }
  };

  const loginWithGoogle = async (portal = 'customer', profileData = null) => {
    try {
      let authResult = profileData;
      if (!authResult || !authResult.idToken) {
        authResult = await triggerGoogleSignIn();
      }
      if (!authResult || (!authResult.idToken && typeof authResult !== 'string')) {
        return { success: false, message: 'Google Sign-In was cancelled.' };
      }

      const idToken = typeof authResult === 'string' ? authResult : authResult.idToken;
      const googleEmail = authResult.email || '';
      const googleName = authResult.name || '';
      const googlePicture = authResult.picture || '';

      const payload = {
        idToken,
        portal,
      };
      if (profileData?.name) payload.name = profileData.name;
      if (profileData?.mobile) payload.mobile = profileData.mobile;
      if (profileData?.password) payload.password = profileData.password;

      const res = await api.post('/api/auth/google', payload);
      const data = await res.json();

      if (res.ok && data.success && data.user && data.token) {
        savePendingGoogleAuth(null);
        setUser(data.user);
        sessionStorage.setItem('nmd_user', JSON.stringify(data.user));
        setToken(data.token);
        sessionStorage.setItem('nmd_jwt_token', data.token);
        return { success: true, user: data.user, token: data.token, isNewUser: data.isNewUser };
      } else if (data.requiresProfileCompletion || data.requiresMobile) {
        const pending = {
          idToken,
          email: data.email || googleEmail,
          name: data.name || googleName,
          picture: googlePicture,
          portal,
        };
        savePendingGoogleAuth(pending);
        return {
          success: true,
          requiresProfileCompletion: true,
          requiresMobile: true,
          pendingGoogleAuth: pending,
          email: pending.email,
          name: pending.name,
          message: data.message,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Google Sign-In failed. Please try again.',
        };
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
      return {
        success: false,
        message: err.message || 'Unable to complete Google Sign-In.',
      };
    }
  };

  const completeGoogleProfile = async ({ name, mobile, password, portal = 'customer' }) => {
    const currentPending = pendingGoogleAuth || (() => {
      try {
        return JSON.parse(sessionStorage.getItem('nmd_pending_google_auth') || 'null');
      } catch (_) {
        return null;
      }
    })();

    if (!currentPending || !currentPending.idToken) {
      return { success: false, message: 'Google session expired. Please sign in again with Google.' };
    }

    return loginWithGoogle(portal || currentPending.portal || 'customer', {
      idToken: currentPending.idToken,
      email: currentPending.email,
      name,
      mobile,
      password,
    });
  };

  const authFetch = async (url, options = {}) => {
    const fullUrl = getApiUrl(url);
    const headers = {
      ...(options.headers || {}),
      ...getAuthHeaders(),
    };
    const res = await fetch(fullUrl, { ...options, headers });
    if (res.status === 401) {
      const clone = res.clone();
      try {
        const data = await clone.json();
        if (data.code === 'TOKEN_EXPIRED') {
          console.warn('JWT token expired during request, logging out.');
          logout();
        }
      } catch (e) {}
    }
    return res;
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken('');
    try {
      sessionStorage.clear();
      localStorage.removeItem('nmd_user');
      localStorage.removeItem('nmd_jwt_token');
      localStorage.removeItem('nmd_admin_tab');
      localStorage.removeItem('nmd_current_tab');
      localStorage.removeItem('nmd_customer_page');
      localStorage.removeItem('nmd_driver_tab');
      localStorage.removeItem('nmd_pending_subscription');

      // Clear user-specific notification caches so next user never sees prior user's notifications
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('nmd_notifs_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
    // Immediately redirect to home page and notify App
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nmd_auth_logout'));
      if (window.location.pathname !== '/') {
        window.history.replaceState({ nmdPage: 'home' }, '', '/');
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        isValidating,
        getAuthHeaders,
        authFetch,
        login,
        loginWithGoogle,
        completeGoogleProfile,
        pendingGoogleAuth,
        savePendingGoogleAuth,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
