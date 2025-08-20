import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LeaveRequests from './pages/LeaveRequests';
import MyRequests from './pages/MyRequests';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/leave-requests" element={
        <ProtectedRoute>
          <Layout>
            <LeaveRequests />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/my-requests" element={
        <ProtectedRoute>
          <Layout>
            <MyRequests />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Layout>
            <Reports />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/employees" element={
        <ProtectedRoute>
          <Layout>
            <Employees />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserProvider>
            <Router>
              <AppRoutes />
            </Router>
            <Toaster />
          </UserProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
