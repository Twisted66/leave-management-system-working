import { api, APIError, Header, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";

interface AuthParams {
  authorization: Header<"Authorization">;
}

export interface AuthData {
  userID: string;
  email: string;
  role: 'employee' | 'manager' | 'hr';
  supabaseUserId: string;
}

// Simple test auth handler
export const auth = authHandler<AuthParams, AuthData>(
  async (params) => {
    console.log('🚀🚀🚀 TEST AUTH HANDLER INVOKED! 🚀🚀🚀');
    console.log('Authorization header:', params.authorization);
    
    // Simple test - just return a test user for now
    return {
      userID: '1',
      email: 'test@example.com',
      role: 'hr',
      supabaseUserId: 'test-user'
    };
  }
);

// Configure API Gateway with auth handler
export const gateway = new Gateway({
  authHandler: auth,
});