import React, { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Link/*, useNavigate*/ } from 'react-router-dom';
import { FaSun, FaMoon, FaHome } from 'react-icons/fa';

const NavBar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem('userId'));
  }, []);

  const { theme, changeTheme } = useTheme(userId);

  const isAuthenticated = localStorage.getItem('isAuthenticated');
  const userType = localStorage.getItem('userType');
  const userName = localStorage.getItem('userName');
  //const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    window.document.documentElement.classList.remove('dark');
    window.location.replace('/radar/'); // <-- fuerza recarga y navegación al login
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-4 py-4 shadow-lg w-full border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between w-full">
        {/* ...existing code... */}
      </div>
      {/* Desktop: all elements in one line */}
      <div className="hidden sm:flex items-center w-full gap-4">
        <span className="font-bold text-lg sm:text-xl tracking-wide">
          <div className="flex items-center gap-2">
            <Link to="dashboard" className="transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center">
              <span className="sr-only">Dashboard</span>
              <svg width="140" height="40" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="34" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="currentColor">RADAR</text>
                <g transform="translate(130, 30)">
                  <path d="M0 -20C11.0457 -20 20 -11.0457 20 0L20 0C20 11.0457 11.0457 20 0 20" stroke={theme === 'dark' ? '#4DA6FF' : '#007ACC'} strokeWidth="4" fill="none" />
                  <path d="M0 -15C8.28427 -15 15 -8.28427 15 0L15 0C15 8.28427 8.28427 15 0 15" stroke={theme === 'dark' ? '#7ADFFF' : '#4DA6FF'} strokeWidth="4" fill="none" />
                  <path d="M0 -10C5.52285 -10 10 -5.52285 10 0L10 0C10 5.52285 5.52285 10 0 10" stroke={theme === 'dark' ? '#B3F0FF' : '#7ADFFF'} strokeWidth="4" fill="none" />
                </g>
              </svg>
            </Link>
            <Link to="dashboard" className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors" title="Dashboard">
              <FaHome size={24} />
            </Link>
          </div>
        </span>
        <Link to="orders" className="transition-colors duration-200 px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" title="Orders">Orders</Link>
        <Link to="claims" className="transition-colors duration-200 px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" title="Claims">Claims</Link>
        <Link to="customers" className="transition-colors duration-200 px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" title="Customers">Customers</Link>
        <Link to="call-log" className="transition-colors duration-200 px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" title="Call Log">Call Log</Link>
        {userType === '1' && (
          <Link to="users" className="transition-colors duration-200 px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" title="Users">Users</Link>
        )}
        {userType === '1' && (
          <Link to="deliveries" className="transition-colors duration-200 px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" title="Deliveries">Deliveries</Link>
        )}
        <Link to="logistics" className="transition-colors duration-200 px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" title="Logistics & Delivery Queues">Logistics</Link>
        <span className="font-semibold text-base sm:text-lg text-blue-700 dark:text-blue-300 ml-auto">{userName}</span>
        <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-semibold">
          {userType === '1' ? 'Sys Admin' : userType === '2' ? 'Operator' : 'Administrator'}
        </span>
        <button
          onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white transition-colors hover:bg-blue-200 dark:hover:bg-blue-800"
          title={theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
        >
          {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
        </button>
        <button
          onClick={handleLogout}
          className="bg-red-400 px-2 sm:px-3 py-1 rounded shadow hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-700 dark:text-white transition-colors"
        >
          Logout
        </button>
      </div>
      {/* Mobile: logo + hamburger */}
      <div className="flex items-center gap-2 sm:hidden w-full justify-between">
        <span className="font-bold text-lg tracking-wide">
          <div className="flex items-center gap-2">
            <Link to="dashboard" className="transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center">
              <span className="sr-only">Dashboard</span>
              <svg width="100" height="32" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="34" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="currentColor">RADAR</text>
                <g transform="translate(130, 30)">
                  <path d="M0 -20C11.0457 -20 20 -11.0457 20 0L20 0C20 11.0457 11.0457 20 0 20" stroke={theme === 'dark' ? '#4DA6FF' : '#007ACC'} strokeWidth="4" fill="none" />
                  <path d="M0 -15C8.28427 -15 15 -8.28427 15 0L15 0C15 8.28427 8.28427 15 0 15" stroke={theme === 'dark' ? '#7ADFFF' : '#4DA6FF'} strokeWidth="4" fill="none" />
                  <path d="M0 -10C5.52285 -10 10 -5.52285 10 0L10 0C10 5.52285 5.52285 10 0 10" stroke={theme === 'dark' ? '#B3F0FF' : '#7ADFFF'} strokeWidth="4" fill="none" />
                </g>
              </svg>
            </Link>
            <Link to="dashboard" className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors" title="Dashboard">
              <FaHome size={28} />
            </Link>
          </div>
        </span>
        <button
          className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      {/* Mobile menu */}
      <div className={`sm:hidden w-full ${menuOpen ? '' : 'hidden'}`}>
        <div className="flex flex-col gap-2 mt-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-4 animate-fade-in">
          <Link to="orders" className="transition-colors duration-200 px-2 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" onClick={() => setMenuOpen(false)}>Orders</Link>
          <Link to="claims" className="transition-colors duration-200 px-2 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" onClick={() => setMenuOpen(false)}>Claims</Link>
          <Link to="customers" className="transition-colors duration-200 px-2 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" onClick={() => setMenuOpen(false)}>Customers</Link>
          {userType !== '3' && <Link to="call-log" className="transition-colors duration-200 px-2 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" onClick={() => setMenuOpen(false)}>Call Log</Link>}
          {userType === '1' && (
            <Link to="users" className="transition-colors duration-200 px-2 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" onClick={() => setMenuOpen(false)}>Users</Link>
          )}
          {userType === '1' && (
            <Link to="deliveries" className="transition-colors duration-200 px-2 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" onClick={() => setMenuOpen(false)}>Deliveries</Link>
          )}
          <Link to="logistics" className="transition-colors duration-200 px-2 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 font-medium" onClick={() => setMenuOpen(false)}>Logistics</Link>
          <div className="flex flex-col gap-2 mt-2 border-t border-gray-200 dark:border-gray-800 pt-2">
            <span className="font-semibold text-base text-blue-700 dark:text-blue-300">{userName}</span>
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs text-blue-700 dark:text-blue-300 font-semibold">
              {userType === '1' ? 'Sys Admin' : userType === '2' ? 'Operator' : 'Administrator'}
            </span>
            <button
              onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white transition-colors hover:bg-blue-200 dark:hover:bg-blue-800"
              title={theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
            >
              {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-400 px-2 py-1 rounded shadow hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-700 dark:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {/* Animación fade-in para el menú móvil */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.25s ease; }
      `}</style>
    </nav>
  );
};

export default NavBar;