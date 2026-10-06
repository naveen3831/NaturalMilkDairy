import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const DEMO_USERS = [
  {
    id: 'usr_admin_1',
    name: 'Dairy Owner (Admin)',
    mobile: '9876543210',
    role: 'admin',
    assignedArea: 'All Dairy Routes',
  },
  {
    id: 'usr_boy_1',
    name: 'Rahul Sharma (Partner)',
    mobile: '9811122233',
    role: 'delivery_boy',
    assignedArea: 'Andheri West',
  },
  {
    id: 'cust_1',
    name: 'Rajesh Sharma (Customer)',
    mobile: '9820011223',
    role: 'customer',
    customerId: 'CUST-101',
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
    return null; // Start as public guest user by default
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('nmd_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nmd_user');
    }
  }, [user]);

  const switchUser = (roleOrId) => {
    const found = DEMO_USERS.find((u) => u.id === roleOrId || u.role === roleOrId);
    if (found) {
      setUser(found);
      return found;
    }
    return null;
  };

  const login = async (mobile, password, role) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password, role }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      }
    } catch (err) {
      console.warn('API login error, using local fallback:', err);
    }
    // Fallback
    const found = DEMO_USERS.find((u) => u.mobile === mobile || u.role === role) || DEMO_USERS[0];
    setUser(found);
    return { success: true, user: found };
  };

  const register = async (formData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (err) {
      console.warn('API register error, falling back:', err);
      const fallbackUser = {
        id: 'usr_' + Date.now(),
        name: formData.name,
        mobile: formData.mobile,
        role: formData.role || 'customer',
        assignedArea: formData.area || 'Andheri West',
      };
      setUser(fallbackUser);
      return { success: true, user: fallbackUser };
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, switchUser, login, register, logout, DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
