import React, { useState, useEffect } from 'react';
//import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';

const LoginForm: React.FC = () => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  //const navigate = useNavigate();

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // setError(''); // Remover para que el error persista hasta el timeout

    try {
  const { data } = await axios.post(`${API_URL}/api/login`, {
        email: user,
        password: pass,
      });
      localStorage.setItem('userId', data.id);
      localStorage.setItem('userName', data.name);
      localStorage.setItem('userType', data.type);
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAuthenticated', 'true');
      window.location.replace('/radar/dashboard'); // <-- fuerza navegación y recarga
    } catch (err) {
      setError('Credenciales inválidas. Inténtalo de nuevo.');
      setTimeout(() => setError(''), 5000); // Limpiar error después de 5 segundos
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-2">
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded shadow-lg z-50 text-lg font-semibold transition-all">
          {error}
        </div>
      )}
      <form
        onSubmit={handleLogin}
        className="bg-gray-200 dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg flex flex-col w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">User Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={user}
          onChange={e => setUser(e.target.value)}
          className="mb-4 p-2 border rounded text-black dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          className="mb-4 p-2 border rounded text-black dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-400 dark:hover:bg-blue-500 dark:text-gray-900 transition-colors font-semibold"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;