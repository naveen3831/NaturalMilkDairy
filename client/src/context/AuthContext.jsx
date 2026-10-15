import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const DEMO_USERS = [
  {
    id: 'usr_admin_1',
    name: 'Dairy Owner (Admin)',
    email: 'admin@gmail.com',
    mobile: 'admin@gmail.com',
    role: 'admin',
    assignedArea: 'All Dairy Routes',
  },
  {
    id: 'usr_boy_1',
    name: 'Rahul Sharma (Partner)',
    email: 'naveenkumar970100@gmail.com',
    mobile: '9701878789',
    role: 'delivery_boy',
    assignedArea: 'madhapur',
  },
  {
    id: 'usr_boy_2',
    name: 'Laddu (Partner)',
    email: 'naveenkumarnaveen97311@gmail.com',
    mobile: '6361923127',
    role: 'delivery_boy',
    assignedArea: 'Andheri West',
  },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nmd_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('nmd_jwt_token') || '');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('nmd_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nmd_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('nmd_jwt_token', token);
    } else {
      localStorage.removeItem('nmd_jwt_token');
    }
  }, [token]);

  // On initial mount, verify token validity with backend if present
  useEffect(() => {
    const storedToken = localStorage.getItem('nmd_jwt_token');
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
    const currentToken = token || localStorage.getItem('nmd_jwt_token');
    const auth = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
    return { ...auth, ...customHeaders };
  }, [token]);

  const login = async (identifier, password) => {
    const trimmed = (identifier || '').trim();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed, mobile: trimmed, email: trimmed, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('nmd_jwt_token', data.token);
        }
        return { success: true, user: data.user, token: data.token };
      } else {
        return { success: false, message: data.message || 'Invalid credentials' };
      }
    } catch (err) {
      console.warn('API login error, using local fallback:', err);
    }

    // Strict fallback for seeded admin only
    if (
      (trimmed.toLowerCase() === 'admin@gmail.com' || trimmed === '9876543210') &&
      password === 'admin@123'
    ) {
      const adminUser = DEMO_USERS[0];
      setUser(adminUser);
      return { success: true, user: adminUser };
    }

    return {
      success: false,
      message: 'Invalid credentials. Please verify your mobile/email and password.',
    };
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
        localStorage.setItem('nmd_jwt_token', data.token);
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

  const switchUser = async (roleOrId) => {
    // If admin
    if (roleOrId === 'admin' || roleOrId === 'usr_admin_1') {
      const res = await login('admin@gmail.com', 'admin@123');
      return res?.user || null;
    }
    // If delivery boy 1
    if (roleOrId === 'usr_boy_1' || roleOrId === 'delivery_boy') {
      const res = await login('9701878789', 'naveen123');
      if (res && res.success) return res.user;
      const res2 = await login('9701878789', 'Driver@123');
      return res2?.user || null;
    }
    // If delivery boy 2
    if (roleOrId === 'usr_boy_2') {
      const res = await login('6361923127', 'naveen123');
      if (res && res.success) return res.user;
      const res2 = await login('6361923127', 'Driver@123');
      return res2?.user || null;
    }
    const found = DEMO_USERS.find((u) => u.id === roleOrId || u.role === roleOrId);
    if (found) {
      setUser(found);
      return found;
    }
    return null;
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

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('nmd_user');
    localStorage.removeItem('nmd_jwt_token');
    localStorage.removeItem('nmd_admin_tab');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        isValidating,
        getAuthHeaders,
        authFetch,
        switchUser,
        login,
        register,
        logout,
        DEMO_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
