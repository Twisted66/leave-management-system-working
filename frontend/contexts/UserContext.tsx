import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import backend from '~backend/client';
import type { Employee } from '~backend/leave/types';

interface UserContextType {
  currentUser: Employee | null;
  setCurrentUser: (user: Employee | null) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For demo purposes, we'll simulate a logged-in user
    // In a real app, this would come from authentication
    const loadUser = async () => {
      try {
        // Simulate loading the first employee as the current user
        const { employees } = await backend.leave.listEmployees();
        if (employees.length > 0) {
          setCurrentUser(employees[3]); // Alice Employee
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
