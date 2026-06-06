import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || window.location.origin;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cek apakah user sudah login saat aplikasi pertama dibuka
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // --- FUNGSI LOGIN YANG SUDAH DIPERBAIKI ---
  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          message: data.detail || 'Login gagal' 
        };
      }

      // Simpan data ke memori browser
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update status aplikasi (sekarang alatnya sudah ada!)
      setCurrentUser(data.user);
      setIsAuthenticated(true);

      return { success: true };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Gagal koneksi: ' + error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const isAdmin = () => currentUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout, loading, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
