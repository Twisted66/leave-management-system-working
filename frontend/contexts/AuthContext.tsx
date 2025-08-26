import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import client from '../lib/client';
import type { leave } from '~backend/client';

type Employee = leave.Employee;

interface AuthContextType {
  currentUser: Employee | null;
  supabaseUser: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEmployeeData = async (user: User, token: string) => {
    try {
      console.log('🔐 Fetching employee data with token:', token ? 'Token present' : 'No token');
      console.log('👤 User ID:', user.id);
      console.log('🎟️ Token preview:', token ? token.substring(0, 50) + '...' : 'undefined');
      
      // Set the authentication header for the client
      const authenticatedClient = client.with({
        requestInit: {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      });
      
      console.log('🌐 Making authenticated request to backend...');
      
      // Try to get user by Supabase ID first
      const response = await authenticatedClient.leave.getUser({ supabaseUserId: user.id });
      
      if (response.employee) {
        setCurrentUser(response.employee);
      } else {
        // If no employee record exists, user needs to be set up in the system
        console.log('No employee record found for user:', user.id);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user && session.access_token) {
        await fetchEmployeeData(session.user, session.access_token);
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user && session.access_token) {
        await fetchEmployeeData(session.user, session.access_token);
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      supabaseUser,
      session,
      isLoading,
      isAuthenticated: !!currentUser,
      token: session?.access_token ?? null,
      login,
      logout,
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
