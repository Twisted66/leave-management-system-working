import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import type { User } from '@auth0/auth0-react';

interface AuthContextType {
  currentUser: User | undefined;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
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

  const [token, setToken] = useState<string | null>(null);

  const login = async () => {
    await loginWithRedirect();
  };

  const getToken = async () => {
    if (isAuthenticated) {
      try {
        const accessToken = await getAccessTokenSilently({
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });
        return accessToken;
      } catch (error) {
        console.error("Error getting access token:", error);
        return null;
      }
    }
    return null;
  };

  // Update token when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      getToken().then(setToken);
    } else {
      setToken(null);
    }
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider value={{
      currentUser: user,
      login,
      logout: () => logout({ logoutParams: { returnTo: window.location.origin } }),
      isLoading,
      isAuthenticated,
      token,
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
