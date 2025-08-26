// Quick script to apply migration 11 to staging database  
import pg from 'pg';
const { Client } = pg;

async function applyMigration() {
  console.log('🔄 Connecting to staging database...');
  
  const client = new Client({
    host: 'localhost',
    port: 62608,
    database: 'leave',
    user: 'encore',
    password: 'SLDa1sdW_Xw',
    ssl: false
  });

  try {
    await client.connect();
    console.log('✅ Connected to staging database');

    // Check current admin user
    console.log('📋 Current admin user:');
    const currentUser = await client.query(
      "SELECT id, email, name, role, supabase_id FROM employees WHERE email = 'admin@example.com' AND role = 'hr'"
    );
    console.log(currentUser.rows[0]);

    // Apply migration 11
    console.log('🔄 Applying migration 11...');
    const result = await client.query(
      "UPDATE employees SET supabase_id = '8655f244-a017-4032-9a7e-9fc2cce53966' WHERE email = 'admin@example.com' AND role = 'hr' RETURNING *"
    );
    
    console.log('✅ Migration applied successfully!');
    console.log('Updated user:', result.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔚 Database connection closed');
  }
}

applyMigration();