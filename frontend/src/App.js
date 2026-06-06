import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// PENTING: Import useAuth juga di sini
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import InputBarang from '@/pages/InputBarang';
import Estimasi from '@/pages/Estimasi';
import Penawaran from '@/pages/Penawaran';
import UserManagement from '@/pages/UserManagement';
import Layout from '@/components/Layout';
import { Toaster } from '@/components/ui/sonner';
import { initializeUsers, initializeBarangData } from '@/utils/initializeData';
import '@/App.css';
import EditEstimasi from '@/pages/EditEstimasi';
import EstimasiForm from '@/pages/EstimasiForm';

// --- KOMPONEN PRIVATE ROUTE YANG DIPERBAIKI ---
const PrivateRoute = ({ children }) => {
  // 1. Kita pakai useAuth() biar sinkron sama AuthContext
  const { isAuthenticated, loading } = useAuth();

  // 2. Jika sistem masih mengecek token (Loading), TAHAN DULU
  // Jangan langsung redirect, atau nanti mental lagi
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg font-semibold text-gray-600">Memuat data...</div>
      </div>
    );
  }

  // 3. Kalau sudah selesai loading, baru cek: Login atau Tidak?
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};
// ---------------------------------------------

function App() {
  useEffect(() => {
    // Initialize default users and barang data on first load
    initializeUsers();
    initializeBarangData();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Bungkus semua halaman dashboard dengan PrivateRoute */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/input-barang" element={<InputBarang />} />
                    <Route path="/estimasi" element={<Estimasi />} />
                    <Route path="/estimasi/new" element={<EstimasiForm />} />
                    <Route path="/estimasi/edit/:id" element={<EditEstimasi />} />
                    <Route path="/penawaran" element={<Penawaran />} />
                    <Route path="/users" element={<UserManagement />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;