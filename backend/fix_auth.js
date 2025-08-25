// Quick script to fix authentication by creating a confirmed admin user
const fetch = require('node-fetch');

async function createConfirmedAdmin() {
  console.log('🔧 Fixing Supabase authentication...');
  
  // Step 1: Create user in Supabase (auto-confirmed)
  try {
    console.log('1. Creating admin user in Supabase...');
    const supabaseResponse = await fetch('https://ocxijuowaqkbyhtnlxdz.supabase.co/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeGlqdW93YXFrYnlodG5seGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NjYzNDAsImV4cCI6MjA3MDA0MjM0MH0.0Pey3LQJ9KdwY320rgNk_VtfyY8yTo7mS9zpYaMUURA',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeGlqdW93YXFrYnlodG5seGR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ2NjM0MCwiZXhwIjoyMDcwMDQyMzQwfQ.YOUR_SERVICE_ROLE_KEY'
      },
      body: JSON.stringify({
        email: 'admin@test.local',
        password: 'AdminTest123',
        email_confirm: true,
        user_metadata: {
          name: 'System Admin'
        }
      })
    });
    
    console.log('Supabase response status:', supabaseResponse.status);
    const supabaseResult = await supabaseResponse.text();
    console.log('Supabase result:', supabaseResult);
    
  } catch (error) {
    console.error('Error creating user:', error.message);
  }
}

createConfirmedAdmin();