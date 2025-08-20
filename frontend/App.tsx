import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LeaveRequests from './pages/LeaveRequests';
import MyRequests from './pages/MyRequests';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import { UserProvider } from './contexts/UserContext';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leave-requests" element={<LeaveRequests />} />
              <Route path="/my-requests" element={<MyRequests />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/employees" element={<Employees />} />
            </Routes>
          </Layout>
        </Router>
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}
