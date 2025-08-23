import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../main';
import client from '~backend/client';
import type { Employee } from '~backend/leave/types';

interface AuthContextType {
  currentUser: Employee | null;
  supabaseUser: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch employee data after authentication
  const fetchEmployeeData = async (user: User, token: string) => {
    try {
      // Set the authentication header for the client
      client.baseClient.getAuthData = () => ({
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Try to get user by Supabase ID first
      const response = await client.getUser({ supabaseUserId: user.id });
      
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

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
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
      signUp,
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
