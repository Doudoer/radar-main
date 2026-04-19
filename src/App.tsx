import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';
import OrdersPage from './pages/OrdersPage';
import ClaimsPage from './pages/ClaimsPage';
import CustomersPage from './pages/CustomersPage';
import UsersPage from './pages/UsersPage';
import CallLogPage from './pages/CallLogPage';
import DeliveriesPage from './pages/DeliveriesPage';
import LogisticsPage from './pages/LogisticsPage';
import PublicLogisticsPage from './pages/PublicLogisticsPage';

const App: React.FC = () => {
  return (
    <Router basename="/radar">
      <NavBar />
      <Routes>
        <Route
          path="/"
          element={
            localStorage.getItem('isAuthenticated') === 'true'
              ? <Navigate to="/dashboard" replace />
              : <LoginForm />
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/claims"
          element={
            <ProtectedRoute>
              <ClaimsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/call-log"
          element={
            <ProtectedRoute>
              <CallLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deliveries"
          element={
            <ProtectedRoute>
              <DeliveriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logistics"
          element={
            <ProtectedRoute>
              <LogisticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared-list/:token"
          element={<PublicLogisticsPage />}
        />
      </Routes>
    </Router>
  );
};

export default App;