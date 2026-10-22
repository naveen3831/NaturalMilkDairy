import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
        const res = await fetch('/api/auth/me', {
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed, mobile: trimmed, email: trimmed, password }),
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
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

  const authFetch = async (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
      ...getAuthHeaders(),
    };
    const res = await fetch(url, { ...options, headers });
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
    } catch (e) {}
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
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
