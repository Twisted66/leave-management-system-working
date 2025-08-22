import { createContext, useContext, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import type { User } from '@auth0/auth0-react';

interface AuthContextType {
  currentUser: User | undefined;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null; // We'll get the token from Auth0 later if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const login = async () => {
    await loginWithRedirect();
  };

  const getToken = async () => {
    if (isAuthenticated) {
      try {
        const accessToken = await getAccessTokenSilently();
        return accessToken;
      } catch (error) {
        console.error("Error getting access token:", error);
        return null;
      }
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{
      currentUser: user,
      login,
      logout: () => logout({ logoutParams: { returnTo: window.location.origin } }),
      isLoading,
      isAuthenticated,
      token: null, // Placeholder, will be updated if needed
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
