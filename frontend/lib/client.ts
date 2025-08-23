// Client configuration wrapper
import { Client, Environment } from '../client';

// Get the correct API URL based on environment
function getApiUrl(): string {
  // Check if we have a configured target from environment
  const envTarget = import.meta.env.VITE_CLIENT_TARGET;
  
  if (envTarget) {
    return envTarget;
  }
  
  // If no environment target, detect if we're in production
  if (window.location.hostname.includes('encr.app')) {
    // Extract environment name from hostname
    const hostname = window.location.hostname;
    const envMatch = hostname.match(/^(\w+)-/);
    const envName = envMatch ? envMatch[1] : 'prod';
    return Environment(envName);
  }
  
  // Default to localhost for development
  return 'http://localhost:4000';
}

// Create client with proper URL
const client = new Client(getApiUrl(), { 
  requestInit: { credentials: "include" } 
});

export default client;