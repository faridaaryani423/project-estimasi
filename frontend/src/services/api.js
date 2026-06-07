// API Service for Weld Planner

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// 2. PERBAIKAN TOKEN (Samakan dengan AuthContext)
// Sebelumnya 'authToken' (salah), sekarang 'token' (benar)
const getToken = () => localStorage.getItem('token');

// API headers with auth
const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// 3. HANDLE RESPONSE "ANTI-CRASH" (Bulletproof)
// Kita baca isinya SEKALI saja sebagai text, baru di-parse.
// Ini mencegah error "Response body already used".
const handleResponse = async (response) => {
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { detail: text || 'Server Error (Non-JSON)' };
  }

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesi berakhir, silakan login ulang');
  }
  
  if (!response.ok) {
    let errorMsg;
    if (Array.isArray(data.detail)) {
      errorMsg = data.detail
        .map(e => {
          const field = e.loc?.[e.loc.length - 1] ?? '';
          return field ? `${field}: ${e.msg}` : e.msg;
        })
        .join(' | ');
    } else {
      errorMsg = data.detail || data.message || 'Terjadi kesalahan pada server';
    }
    throw new Error(errorMsg);
  }
  
  return data;
};

// ========================= AUTH =========================

export const authAPI = {
  login: async (username, password) => {
    // Pastikan URL ada /api nya sesuai backend
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
  },
  
  getMe: async () => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  }
};

// ========================= USERS =========================

export const usersAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/api/users`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  updatePassword: async (userId, password) => {
    const response = await fetch(`${API_URL}/api/users/${userId}/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ password })
    });
    return handleResponse(response);
  }
};

// ========================= BARANG =========================

export const barangAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/api/barang`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  create: async (data) => {
    const response = await fetch(`${API_URL}/api/barang`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  update: async (id, data) => {
    const response = await fetch(`${API_URL}/api/barang/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  delete: async (id) => {
    const response = await fetch(`${API_URL}/api/barang/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(response);
  }
};

// ========================= ESTIMASI =========================

export const estimasiAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/api/estimasi`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  create: async (data) => {
    const response = await fetch(`${API_URL}/api/estimasi`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  update: async (id, data) => {
    const response = await fetch(`${API_URL}/api/estimasi/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  delete: async (id) => {
    const response = await fetch(`${API_URL}/api/estimasi/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(response);
  }
};

// ========================= PENAWARAN =========================

export const penawaranAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/api/penawaran`, {
      headers: getHeaders()
    });
    return handleResponse(response);
  },
  
  create: async (data) => {
    const response = await fetch(`${API_URL}/api/penawaran`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  update: async (id, data) => {
    const response = await fetch(`${API_URL}/api/penawaran/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },
  
  delete: async (id) => {
    const response = await fetch(`${API_URL}/api/penawaran/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(response);
  }
};
