import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const switchUser = (roleOrId) => {
    const found = DEMO_USERS.find((u) => u.id === roleOrId || u.role === roleOrId);
    if (found) {
      setUser(found);
      return found;
    }
    return null;
  };

  const getAuthHeaders = () => {
    const currentToken = token || localStorage.getItem('nmd_jwt_token');
    return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
  };

  const login = async (identifier, password) => {
    const trimmed = (identifier || '').trim();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: trimmed, email: trimmed, password }),
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
      message: 'Invalid credentials. Only seeded admin (admin@gmail.com / admin@123) can sign in.',
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

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('nmd_user');
    localStorage.removeItem('nmd_jwt_token');
    localStorage.removeItem('nmd_admin_tab');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, getAuthHeaders, switchUser, login, register, logout, DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
