import axios from 'axios';
import CryptoJS from 'crypto-js';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'defaultkey'; // Debe coincidir con el servidor

function decryptData(encrypted: string) {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

// Configurar axios con interceptor para incluir token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
axios.interceptors.response.use(
  (response) => {
    // Desencriptar si la respuesta tiene encrypted
    if (response.data && response.data.encrypted) {
      response.data = decryptData(response.data.encrypted);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // No redirigir si es el endpoint de login
      if (error.config?.url?.includes('/api/login')) {
        return Promise.reject(error);
      }
      // Token inválido o expirado, redirigir a login
      localStorage.clear();
      window.location.href = '/radar';
    }
    return Promise.reject(error);
  }
);