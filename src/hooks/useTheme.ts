import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

type ThemeType = 'dark' | 'light';

export function useTheme(userId: string | null) {
  const [theme, setTheme] = useState<ThemeType>('light');

  // Leer preferencia al cargar el usuario
  useEffect(() => {
    async function loadTheme() {
      // Primero intenta leer de la API
      if (userId) {
        try {
          const { data } = await axios.get(`${API_URL}/api/user/${userId}`);
          // El campo theme es 1 (dark) o 0 (light)
          const dbTheme = data.theme === 1 ? 'dark' : 'light';
          setTheme(dbTheme);
          localStorage.setItem('theme', dbTheme);
          return;
        } catch {
          // Si falla, usa localStorage
        }
      }
      // Si no hay usuario, usa localStorage
      const localTheme = localStorage.getItem('theme');
      if (localTheme === 'dark' || localTheme === 'light') {
        setTheme(localTheme);
      } else {
        setTheme('light');
      }
    }
    loadTheme();
  }, [userId]);

  // Aplica el tema al <html> cada vez que cambia
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Cambia el tema y lo guarda en la API y localStorage
  const changeTheme = async (newTheme: ThemeType) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (userId) {
      try {
        await axios.put(`${API_URL}/api/user/${userId}/theme`, {
          theme: newTheme === 'dark' ? 1 : 0,
        });
      } catch {
        // Si falla, solo actualiza localStorage
      }
    }
  };

  return { theme, changeTheme };
}