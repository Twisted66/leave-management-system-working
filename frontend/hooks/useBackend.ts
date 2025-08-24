import { useAuth } from '../contexts/AuthContext';
import backend from '../lib/client';

// Returns the backend client with authentication configured
export function useBackend() {
  const { token, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !token) {
    return backend;
  }
  
  return backend.with({
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
