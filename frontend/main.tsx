import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { createClient } from '@supabase/supabase-js';

// Supabase setup - SO MUCH SIMPLER!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase Config:', {
  url: supabaseUrl,
  key: supabaseKey?.substring(0, 10) + '...' // Don't log full key
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
