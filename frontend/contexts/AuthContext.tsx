import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import backend from '~backend/client';
import type { Employee } from '~backend/leave/types';

interface AuthContextType {
  currentUser: Employee | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  department: string;
  role?: 'employee' | 'manager' | 'hr';
  managerId?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
      validateToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (tokenToValidate: string) => {
    try {
      // Decode JWT to get user info (basic validation)
      const payload = JSON.parse(atob(tokenToValidate.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }

      // Get user data from the token payload
      const userData = await backend.leave.getEmployee({ id: parseInt(payload.userId) });
      setCurrentUser(userData);
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('authToken');
      setToken(null);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await backend.leave.login({ email, password });
      setCurrentUser(response.employee);
      setToken(response.token);
      localStorage.setItem('authToken', response.token);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await backend.leave.register(data);
      setCurrentUser(response.employee);
      setToken(response.token);
      localStorage.setItem('authToken', response.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      register,
      logout,
      isLoading,
      isAuthenticated: !!currentUser,
      token
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
