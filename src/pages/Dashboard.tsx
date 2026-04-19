import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Registrar escalas globalmente
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TimeScale);
import axios from 'axios';
import { API_URL } from '../config/api';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaUsers, FaUserCog, FaChartBar, FaClipboardList, FaPhone, FaDollarSign } from 'react-icons/fa';

interface Stats {
  totalOrders: number;
  totalCustomers: number;
  totalUsers: number;
  activeOrdersCount: number;
  ordersByStatus: { [key: string]: number };
  totalSales: number;
}

const Dashboard: React.FC = () => {
  const [userType, setUserType] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalCustomers: 0,
    totalUsers: 0,
    activeOrdersCount: 0,
    ordersByStatus: {},
    totalSales: 0
  });
  const [loading, setLoading] = useState(true);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  // Filtro de fechas para el modal de ventas
  const [salesFilter, setSalesFilter] = useState<{ start: string, end: string }>(() => {
    // Por defecto: semana actual (Lunes a Domingo)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    // Calcular días hasta el lunes anterior (o el lunes actual si hoy es lunes)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const start = new Date(now);
    start.setDate(now.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Domingo (6 días después del lunes)
    end.setHours(23, 59, 59, 999);

    // Usar componentes locales para evitar problemas de timezone con toISOString()
    const fmt = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return { start: fmt(start), end: fmt(end) };
  });
  // Datos completos (1 año de historia)
  const [fullSalesHistory, setFullSalesHistory] = useState<any>(null);
  const [salesHistoryLoaded, setSalesHistoryLoaded] = useState(false);
  // Totales calculados (filtrados por salesFilter)
  const [calculatedTotals, setCalculatedTotals] = useState<any>(null);

  // Fechas de referencia independientes para cada gráfico
  const [dayChartRefDate, setDayChartRefDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [weekChartRefDate, setWeekChartRefDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [monthChartRefDate, setMonthChartRefDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [yearChartRefDate, setYearChartRefDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  // Sincronizar fechas de gráficos cuando cambia el filtro principal (reset)
  useEffect(() => {
    if (salesFilter.end) {
      setDayChartRefDate(salesFilter.end);
      setWeekChartRefDate(salesFilter.end);
      setMonthChartRefDate(salesFilter.end);
      setYearChartRefDate(salesFilter.end);
    }
  }, [salesFilter.end]);

  // Funciones de navegación para gráficos
  const moveDate = (refDate: string, setRef: React.Dispatch<React.SetStateAction<string>>, amount: number, unit: 'days' | 'months' | 'years') => {
    const d = new Date(refDate + 'T12:00:00'); // Evitar problemas de timezone
    if (unit === 'days') d.setDate(d.getDate() + amount);
    if (unit === 'months') d.setMonth(d.getMonth() + amount);
    if (unit === 'years') d.setFullYear(d.getFullYear() + amount);
    setRef(d.toISOString().slice(0, 10));
  };

  // Datos avanzados para el modal

  const [statsLoading, setStatsLoading] = useState(false);




  useEffect(() => {
    const storedUserType = localStorage.getItem('userType');
    const storedUserName = localStorage.getItem('userName');
    setUserType(storedUserType ? Number(storedUserType) : null);
    setUserName(storedUserName || '');

    // Si no hay nombre, intenta obtenerlo del backend
    if (!storedUserName) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        axios.get(`${API_URL}/api/user/${userId}`)
          .then(res => {
            setUserName(res.data.name);
            setUserType(Number(res.data.type));
            localStorage.setItem('userName', res.data.name);
            localStorage.setItem('userType', String(res.data.type));
          })
          .catch(() => { });
      }
    }

    // Cargar estadísticas iniciales
    loadStats();

    // Actualizar estadísticas cada 20 segundos
    const interval = setInterval(() => {
      loadStats();
    }, 20000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(interval);
  }, []);

  // Efecto para cerrar modal con Esc
  useEffect(() => {
    if (!isSalesModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSalesModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isSalesModalOpen]);

  const loadStats = async () => {
    try {
      // No mostrar loading para evitar parpadeo visual
      // setLoading(true);

      // Función para obtener todas las órdenes sin límite alto
      const fetchAllOrders = async () => {
        const allOrders = [];
        let page = 1;
        const limit = 1000; // Límite por página razonable
        while (true) {
          const res = await axios.get(`${API_URL}/api/orders`, { params: { page, limit } });
          const orders = res.data.orders || [];
          allOrders.push(...orders);
          if (orders.length < limit) break;
          page++;
        }
        return allOrders;
      };

      // Función para obtener todos los clientes
      const fetchAllCustomers = async () => {
        const allCustomers = [];
        let page = 1;
        const limit = 1000;
        while (true) {
          const res = await axios.get(`${API_URL}/api/customers`, { params: { page, limit } });
          const customers = res.data.customers || [];
          allCustomers.push(...customers);
          if (customers.length < limit) break;
          page++;
        }
        return allCustomers;
      };

      // Función para obtener todos los usuarios
      const fetchAllUsers = async () => {
        const allUsers = [];
        let page = 1;
        const limit = 1000;
        while (true) {
          const res = await axios.get(`${API_URL}/api/users`, { params: { page, limit } });
          const users = res.data.users || [];
          allUsers.push(...users);
          if (users.length < limit) break;
          page++;
        }
        return allUsers;
      };

      // Función para obtener las ventas mensuales y avanzadas
      const fetchMonthlySales = async () => {
        const res = await axios.get(`${API_URL}/api/monthly-sales`);
        return res.data.total || 0;
      };
      // Función para obtener estadísticas avanzadas por rango de fechas


      const [orders, customers, users, monthlySales] = await Promise.all([
        fetchAllOrders(),
        fetchAllCustomers(),
        fetchAllUsers(),
        fetchMonthlySales()
      ]);

      const activeOrders = orders.filter((order: any) => !order.archived);

      // Contar órdenes por status
      const ordersByStatus: { [key: string]: number } = {};
      orders.forEach((order: any) => {
        const status = order.status || 'Unknown';
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
      });

      // Calcular Active Orders (solo no archivadas)
      const activeOrdersCount = activeOrders.reduce((sum: number, order: any) => {
        const lowerStatus = order.status.toLowerCase();
        if (!lowerStatus.includes('picked up') && !lowerStatus.includes('shipped') && !lowerStatus.includes('refunded')) {
          return sum + 1;
        }
        return sum;
      }, 0);



      setStats({
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalUsers: users.length,
        activeOrdersCount,
        ordersByStatus,
        totalSales: monthlySales
      });




      // Calcular Totales Iniciales se manejará en el useEffect que observa salesFilter y fullSalesHistory
      // filterTotals(advStats, orders, salesFilter); // Eliminado para evitar doble cálculo o error


    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      // Solo mostrar loading en la carga inicial
      if (stats.totalOrders === 0) {
        setLoading(false);
      }
    }
  };



  // Effect para recalcular totales y pedir desglose exacto al backend
  useEffect(() => {
    if (fullSalesHistory) {
      const fetchData = async () => {
        setStatsLoading(true);
        try {
          // Fetch breakdown from backend
          const res = await axios.get(`${API_URL}/api/sales-stats-breakdown`, {
            params: { start: salesFilter.start, end: salesFilter.end }
          });
          // Backend now returns all breakdowns filtered by date
          const { countPaid, countPending, totalRefundsValue, totalSalesValue, totalOrders, byBrand, byModel, byType, byCustomer, bySeller, byPayMethod } = res.data;

          setCalculatedTotals({
            totalSales: totalSalesValue,
            totalRefunds: totalRefundsValue,
            totalNet: totalSalesValue - totalRefundsValue,
            totalOrders: totalOrders,
            countPaid: countPaid,
            countPending: countPending,
            byBrand: byBrand,
            byModel: byModel,
            byType: byType,
            byCustomer: byCustomer,
            bySeller: bySeller,
            byPayMethod: byPayMethod
          });

        } catch (e) {
          console.error("Error fetching breakdown", e);
        } finally {
          setStatsLoading(false);
        }
      };

      const timer = setTimeout(fetchData, 300);
      return () => clearTimeout(timer);
    }
  }, [salesFilter, fullSalesHistory]);

  // Cargar historial de ventas (1 año) al montar el componente
  useEffect(() => {

    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/sales-history`);
        const salesData = res.data.salesByDay || [];
        setFullSalesHistory(salesData);
        setSalesHistoryLoaded(true);
      } catch (e) {
        console.error("Error fetching sales history", e);
        setFullSalesHistory([]);
        setSalesHistoryLoaded(true);
      }
    };
    fetchHistory();
  }, []); // Solo ejecutar una vez al montar

  // Función para generar datos de gráficas (con useCallback para evitar stale closures)
  const getChartData = React.useCallback((type: 'day' | 'week' | 'month' | 'year') => {

    if (!salesHistoryLoaded || !fullSalesHistory || !Array.isArray(fullSalesHistory) || fullSalesHistory.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Ventas ($)',
          data: [],
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }]
      };
    }

    const refDate = type === 'day' ? dayChartRefDate :
      type === 'week' ? weekChartRefDate :
        type === 'month' ? monthChartRefDate : yearChartRefDate;



    if (!refDate) {
      return {
        labels: [],
        datasets: [{
          label: 'Ventas ($)',
          data: [],
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }]
      };
    }

    const ref = new Date(refDate + 'T12:00:00');
    const labels: string[] = [];
    const data: number[] = [];

    if (type === 'day') {
      // Últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const d = new Date(ref);
        d.setDate(ref.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        // Formato: Lun 12
        labels.push(`${dayNames[d.getDay()]} ${d.getDate()}`);

        const dayData = fullSalesHistory.find((s: any) => s.date === dateStr);
        data.push(dayData ? dayData.total : 0);
      }
    } else if (type === 'week') {
      // Últimas 4 semanas
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(ref);
        weekEnd.setDate(ref.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);

        // Formato: 26-02 (Día inicio - Día fin)
        const formatDay = (d: Date) => String(d.getDate()).padStart(2, '0');
        labels.push(`${formatDay(weekStart)}-${formatDay(weekEnd)}`);

        let weekTotal = 0;
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          const dayData = fullSalesHistory.find((s: any) => s.date === dateStr);
          if (dayData) weekTotal += dayData.total;
        }
        data.push(weekTotal);
      }
    } else if (type === 'month') {
      // Últimos 3 meses
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(ref);
        d.setMonth(ref.getMonth() - i);
        // Formato: Nov 25
        labels.push(`${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`);

        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        let monthTotal = 0;
        fullSalesHistory.forEach((s: any) => {
          const sDate = new Date(s.date);
          if (sDate >= monthStart && sDate <= monthEnd) {
            monthTotal += s.total;
          }
        });
        data.push(monthTotal);
      }
    } else if (type === 'year') {
      // Años disponibles (centrado en refDate)
      const years = [...new Set(fullSalesHistory.map((s: any) => new Date(s.date).getFullYear()))] as number[];
      years.sort();
      const refYear = ref.getFullYear();
      const filteredYears = years.filter((y: number) => Math.abs(y - refYear) <= 2).sort();

      filteredYears.forEach(year => {
        labels.push(String(year));
        const yearTotal = fullSalesHistory
          .filter((s: any) => new Date(s.date).getFullYear() === year)
          .reduce((sum: number, s: any) => sum + s.total, 0);
        data.push(yearTotal);
      });
    }

    return {
      labels,
      datasets: [{
        label: 'Ventas ($)',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    };
  }, [fullSalesHistory, salesHistoryLoaded, dayChartRefDate, weekChartRefDate, monthChartRefDate, yearChartRefDate]);

  const handlePrevWeekMain = () => {
    const s = new Date(salesFilter.start + 'T12:00:00');
    s.setDate(s.getDate() - 7);
    const e = new Date(salesFilter.end + 'T12:00:00');
    e.setDate(e.getDate() - 7);

    // Usar formato local para evitar problemas de timezone
    const fmt = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setSalesFilter({ start: fmt(s), end: fmt(e) });
    loadStats();
  };

  const handleNextWeekMain = () => {
    const s = new Date(salesFilter.start + 'T12:00:00');
    s.setDate(s.getDate() + 7);
    const e = new Date(salesFilter.end + 'T12:00:00');
    e.setDate(e.getDate() + 7);

    // Usar formato local para evitar problemas de timezone
    const fmt = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setSalesFilter({ start: fmt(s), end: fmt(e) });
    loadStats();
  };

  const getRoleName = () => {
    if (userType === 1) return 'Sys Admin';
    if (userType === 2) return 'Operator';
    return 'Administrator';
  };

  const getNavigationCards = () => {
    const cards = [
      {
        title: 'Orders',
        description: 'Manage and track orders',
        icon: <FaShoppingCart className="text-3xl text-blue-500" />,
        link: '/orders',
        allowed: true // Todos tienen acceso
      },
      {
        title: 'Customers',
        description: 'View and manage customers',
        icon: <FaUsers className="text-3xl text-green-500" />,
        link: '/customers',
        allowed: true // Todos tienen acceso
      },
      {
        title: 'Call Log',
        description: 'View call logs',
        icon: <FaPhone className="text-3xl text-red-500" />,
        link: '/call-log',
        allowed: true
      }
    ];

    if (userType === 1) {
      cards.push({
        title: 'Users',
        description: 'Manage system users',
        icon: <FaUserCog className="text-3xl text-purple-500" />,
        link: '/users',
        allowed: true
      });
    }

    {/*if (userType === 1 || userType === 2) {
      cards.push({
        title: 'Call Log',
        description: 'View call logs',
        icon: <FaPhone className="text-3xl text-red-500" />,
        link: '/call-log',
        allowed: true
      });
    }
*/}
    return cards;
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Pending')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (status.includes('Verify')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (status.includes('Paid')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (status.includes('Shipped')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    if (status.includes('Claim')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-8">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
          <h1 className="text-2xl font-bold mb-1 text-center">
            Welcome back, {userName}
          </h1>
          <div className="text-center">
            <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
              {getRoleName()} Dashboard
            </span>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="flex flex-wrap gap-6 mb-8">
          {getNavigationCards().map((card, index) => (
            <Link key={index} to={card.link} className="flex-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  {card.icon}
                  <FaClipboardList className="text-gray-400 text-xl" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Statistics Cards */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Total Orders</p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {loading ? '...' : stats.totalOrders}
                </p>
              </div>
              <FaShoppingCart className="text-blue-500 text-4xl" />
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Active Orders</p>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {loading ? '...' : stats.activeOrdersCount}
                </p>
              </div>
              <FaChartBar className="text-orange-500 text-4xl" />
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Total Customers</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {loading ? '...' : stats.totalCustomers}
                </p>
              </div>
              <FaUsers className="text-green-500 text-4xl" />
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Total Users</p>
                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {loading ? '...' : stats.totalUsers}
                </p>
              </div>
              <FaUserCog className="text-purple-500 text-4xl" />
            </div>
          </div>

          {userType !== 2 && (
            <div onClick={() => setIsSalesModalOpen(true)} className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Monthly Sales</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {loading ? '...' : `$${stats.totalSales.toFixed(2)}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Click to View more</p>
                </div>
                <FaDollarSign className="text-red-500 text-2xl" />
              </div>
            </div>
          )}
        </div>

        {/* Orders by Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Orders by Status</h2>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : Object.keys(stats.ordersByStatus).length === 0 ? (
            <div className="text-center py-8 text-gray-500">No orders found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white ml-4">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales Statistics Modal */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsSalesModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Estadísticas de Ventas</h2>
              <button onClick={() => setIsSalesModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
            </div>
            {/* Header de fechas y controles */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">

              {/* Controles de fecha (Grid en móvil, Flex en desktop) */}
              <div className="w-full md:w-auto grid grid-cols-2 md:flex items-center gap-4">

                {/* Container de Fechas - Arriba en móvil (col-span-2), Centro en desktop */}
                <div className="col-span-2 order-first md:order-2 flex gap-2 items-center justify-center w-full md:w-auto">
                  <input
                    type="date"
                    value={salesFilter.start}
                    onChange={e => setSalesFilter(f => ({ ...f, start: e.target.value }))}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-800 text-sm w-[45%] md:w-auto focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-gray-500 font-bold">-</span>
                  <input
                    type="date"
                    value={salesFilter.end}
                    onChange={e => {
                      setSalesFilter(f => ({ ...f, end: e.target.value }));
                      setTimeout(loadStats, 100);
                    }}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-800 text-sm w-[45%] md:w-auto focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Botón Anterior - Abajo Izquierda en móvil, Izquierda en desktop */}
                <div className="flex justify-end md:block md:order-1">
                  <button onClick={handlePrevWeekMain} className="p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 rounded-full shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-blue-500" title="Semana Anterior">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                </div>

                {/* Botón Siguiente - Abajo Derecha en móvil, Derecha en desktop */}
                <div className="flex justify-start md:block md:order-3">
                  <button onClick={handleNextWeekMain} className="p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 rounded-full shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-blue-500" title="Semana Siguiente">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>

              </div>

              <button onClick={() => loadStats()} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow transition-colors md:ml-auto flex items-center justify-center gap-2">
                <span className="hidden sm:inline">Actualizar</span>
                <span>Datos</span>
              </button>
            </div>

            {/* Estadísticas avanzadas */}
            {calculatedTotals ? (
              <div className="space-y-6">
                <div className={`transition-opacity duration-300 ${statsLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  {/* Cards Row (Existing) */}
                  <div className="flex flex-wrap gap-6 justify-center mb-8">
                    <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg text-center flex-1 min-w-[150px]">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">Total de Ventas</p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">${calculatedTotals.totalSales?.toFixed(2) ?? '0.00'}</p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center flex-1 min-w-[150px]">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">Total Reembolsos</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">${calculatedTotals.totalRefunds?.toFixed(2) ?? '0.00'}</p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center flex-1 min-w-[150px]">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">Total Neto</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">${calculatedTotals.totalNet?.toFixed(2) ?? '0.00'}</p>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg text-center flex-1 min-w-[150px]">
                      <div className="flex flex-col h-full justify-between">
                        <div className="border-b border-purple-200 dark:border-purple-700 pb-2 mb-2">
                          <p className="text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">Pagadas</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{calculatedTotals.countPaid ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">Pendientes</p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{calculatedTotals.countPending ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agrupados Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* By Product Type */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded text-sm">
                      <h3 className="font-semibold mb-3 text-lg border-b pb-2">Por Producto</h3>
                      <ul className="space-y-1">
                        {calculatedTotals.byType?.map((t: any) => (
                          <li key={t.type} className="flex justify-between">
                            <span>{t.type || 'N/A'}</span>
                            <span className="font-bold">${Number(t.total).toFixed(2)}</span>
                          </li>
                        ))}
                        {!calculatedTotals.byType?.length && <li className="text-gray-500">No data</li>}
                      </ul>
                    </div>

                    {/* By Brand */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded text-sm">
                      <h3 className="font-semibold mb-3 text-lg border-b pb-2">Por Marca</h3>
                      <ul className="space-y-1">
                        {calculatedTotals.byBrand?.map((b: any) => (
                          <li key={b.brand} className="flex justify-between">
                            <span>{b.brand || 'N/A'}</span>
                            <span className="font-bold">${Number(b.total).toFixed(2)}</span>
                          </li>
                        ))}
                        {!calculatedTotals.byBrand?.length && <li className="text-gray-500">No data</li>}
                      </ul>
                    </div>

                    {/* By Model (Scrollable) */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded text-sm ">
                      <h3 className="font-semibold mb-3 text-lg border-b pb-2">Por Modelo</h3>
                      <div className="max-h-60 overflow-y-auto pr-2 space-y-1">
                        {calculatedTotals.byModel?.map((m: any) => (
                          <li key={m.model} className="flex justify-between border-b border-gray-200 dark:border-gray-600/30 pb-1">
                            <span className="truncate">{m.model || 'N/A'}</span>
                            <span className="font-bold">${Number(m.total).toFixed(2)}</span>
                          </li>
                        ))}
                        {!calculatedTotals.byModel?.length && <div className="text-gray-500">No data</div>}
                      </div>
                    </div>

                    {/* By Pay Method (NEW) */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded text-sm">
                      <h3 className="font-semibold mb-3 text-lg border-b pb-2">Por Método de Pago</h3>
                      <ul className="space-y-1">
                        {calculatedTotals.byPayMethod?.map((p: any) => (
                          <li key={p.type} className="flex justify-between">
                            <span>{p.type || 'N/A'}</span>
                            <span className="font-bold">${Number(p.total).toFixed(2)}</span>
                          </li>
                        ))}
                        {!calculatedTotals.byPayMethod?.length && <li className="text-gray-500">No data</li>}
                      </ul>
                    </div>

                    {/* By User (Top 10) */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded text-sm">
                      <h3 className="font-semibold mb-3 text-lg border-b pb-2">Por Cliente (Top 10)</h3>
                      <ul className="space-y-1">
                        {calculatedTotals.byCustomer?.map((c: any) => (
                          <li key={c.customer} className="flex justify-between">
                            <span className="truncate max-w-[120px]" title={c.customer}>{c.customer || 'Desconocido'}</span>
                            <span className="font-bold">${Number(c.total).toFixed(2)}</span>
                          </li>
                        ))}
                        {!calculatedTotals.byCustomer?.length && <li className="text-gray-500">No data</li>}
                      </ul>
                    </div>


                    {/* By Usuario */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded text-sm">
                      <h3 className="font-semibold mb-3 text-lg border-b pb-2">Por Usuario</h3>
                      <ul className="space-y-1">
                        {calculatedTotals.bySeller?.map((s: any) => (
                          <li key={s.seller} className="flex justify-between">
                            <span className="truncate max-w-[120px]" title={s.seller}>{s.seller || 'Desconocido'}</span>
                            <span className="font-bold">${Number(s.total).toFixed(2)}</span>
                          </li>
                        ))}
                        {!calculatedTotals.bySeller?.length && <li className="text-gray-500">No data</li>}
                      </ul>
                    </div>

                  </div>
                </div>

                {/* Gráficos de ventas */}
                <hr className="border-gray-200 dark:border-gray-700" />
                <h3 className="font-bold text-xl mb-4 text-center">Gráficos de Tendencias</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Graph Day */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg shadow">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-2">
                      <h4 className="font-semibold text-center md:order-2 md:mx-4 text-gray-700 dark:text-gray-300">Por Día (7 Días)</h4>
                      <div className="flex justify-between w-full md:w-auto md:contents">
                        <button onClick={() => moveDate(dayChartRefDate, setDayChartRefDate, -1, 'days')} className="md:order-1 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full shadow-sm transition-colors text-gray-600 dark:text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <button onClick={() => moveDate(dayChartRefDate, setDayChartRefDate, 1, 'days')} className="md:order-3 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full shadow-sm transition-colors text-gray-600 dark:text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      </div>
                    </div>
                    <Bar data={getChartData('day')} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  </div>

                  {/* Graph Week */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg shadow">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-2">
                      <h4 className="font-semibold text-center md:order-2 md:mx-4 text-gray-700 dark:text-gray-300">Por Semana (4 Semanas)</h4>
                      <div className="flex justify-between w-full md:w-auto md:contents">
                        <button onClick={() => moveDate(weekChartRefDate, setWeekChartRefDate, -1, 'months')} className="md:order-1 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full shadow-sm transition-colors text-gray-600 dark:text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <button onClick={() => moveDate(weekChartRefDate, setWeekChartRefDate, 1, 'months')} className="md:order-3 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full shadow-sm transition-colors text-gray-600 dark:text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      </div>
                    </div>
                    <Bar data={getChartData('week')} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  </div>

                  {/* Graph Month */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg shadow">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-2">
                      <h4 className="font-semibold text-center md:order-2 md:mx-4 text-gray-700 dark:text-gray-300">Por Mes (Trimestral)</h4>
                      <div className="flex justify-between w-full md:w-auto md:contents">
                        <button onClick={() => moveDate(monthChartRefDate, setMonthChartRefDate, -3, 'months')} className="md:order-1 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full shadow-sm transition-colors text-gray-600 dark:text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <button onClick={() => moveDate(monthChartRefDate, setMonthChartRefDate, 3, 'months')} className="md:order-3 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full shadow-sm transition-colors text-gray-600 dark:text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      </div>
                    </div>
                    <Bar data={getChartData('month')} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  </div>

                  {/* Graph Year */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg shadow">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-2">
                      <h4 className="font-semibold text-center md:order-2 md:mx-4 text-gray-700 dark:text-gray-300">Por Año</h4>
                      <div className="flex justify-between w-full md:w-auto md:contents">
                        <button onClick={() => moveDate(yearChartRefDate, setYearChartRefDate, -1, 'years')} className="md:order-1 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full shadow-sm transition-colors text-gray-600 dark:text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <button onClick={() => moveDate(yearChartRefDate, setYearChartRefDate, 1, 'years')} className="md:order-3 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full shadow-sm transition-colors text-gray-600 dark:text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      </div>
                    </div>
                    <Bar data={getChartData('year')} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">Cargando estadísticas...</div>
            )}
          </div>
        </div>
      )
      }
    </div>
  );
};

export default Dashboard;