import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Employee } from '~backend/leave/types';

interface UserContextType {
  currentUser: Employee | null;
  setCurrentUser: (user: Employee | null) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useAuth();

  const setCurrentUser = (user: Employee | null) => {
    // This is now handled by the AuthContext
  };

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
