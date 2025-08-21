import { useAuth } from '../contexts/AuthContext';
import backend from '~backend/client';

// Returns the backend client with authentication configured
export function useBackend() {
  const { token, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !token) {
    return backend;
  }
  
  return backend.with({
    auth: () => Promise.resolve({ authorization: `Bearer ${token}` })
  });
}
