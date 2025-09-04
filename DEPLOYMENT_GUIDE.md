# Deployment Guide: Vercel + Supabase

This guide will help you deploy the Leave Management System to Vercel (frontend) and Supabase (backend + database).

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
3. **GitHub Account**: For connecting repositories

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization and region
4. Set project name: `leave-management-system`
5. Set database password (save this!)
6. Click "Create new project"

## Step 2: Configure Supabase Database

Once your project is ready:

1. Go to SQL Editor in your Supabase dashboard
2. Run the following SQL to create the database schema:

```sql
-- Create employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_user_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee',
    department VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leave_types table
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_days_per_year INTEGER,
    can_be_carried_over BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leave_balances table
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    leave_type_id UUID REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    allocated_days INTEGER NOT NULL,
    used_days INTEGER DEFAULT 0,
    pending_days INTEGER DEFAULT 0,
    carried_over_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, leave_type_id, year)
);

-- Create leave_requests table
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    leave_type_id UUID REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reason TEXT,
    manager_notes TEXT,
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default leave types
INSERT INTO leave_types (name, description, max_days_per_year, can_be_carried_over, requires_approval) VALUES
('Annual Leave', 'Yearly vacation days', 25, true, true),
('Sick Leave', 'Medical leave', 10, false, false),
('Personal Leave', 'Personal time off', 5, false, true),
('Maternity Leave', 'Maternity leave', 90, false, true),
('Paternity Leave', 'Paternity leave', 10, false, true);
```

## Step 3: Enable Row Level Security

1. Go to Authentication > Policies in Supabase dashboard
2. Enable RLS for all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Users can view their own employee record" ON employees
    FOR SELECT USING (supabase_user_id = auth.uid());

CREATE POLICY "Users can update their own employee record" ON employees
    FOR UPDATE USING (supabase_user_id = auth.uid());

-- Create policies for leave_types (everyone can read)
CREATE POLICY "Anyone can view leave types" ON leave_types
    FOR SELECT USING (is_active = true);

-- Create policies for leave_balances
CREATE POLICY "Users can view their own leave balances" ON leave_balances
    FOR SELECT USING (employee_id IN (
        SELECT id FROM employees WHERE supabase_user_id = auth.uid()
    ));

-- Create policies for leave_requests
CREATE POLICY "Users can view their own leave requests" ON leave_requests
    FOR SELECT USING (employee_id IN (
        SELECT id FROM employees WHERE supabase_user_id = auth.uid()
    ));

CREATE POLICY "Users can create their own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (employee_id IN (
        SELECT id FROM employees WHERE supabase_user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own pending leave requests" ON leave_requests
    FOR UPDATE USING (employee_id IN (
        SELECT id FROM employees WHERE supabase_user_id = auth.uid()
    ) AND status = 'pending');
```

## Step 4: Configure Authentication

1. Go to Authentication > Settings in Supabase dashboard
2. Under "Auth Settings":
   - Add your domain to "Site URL" (e.g., `https://your-app.vercel.app`)
   - Add redirect URLs for local development: `http://localhost:5173`
3. Configure email templates if needed

## Step 5: Get Supabase Credentials

1. Go to Settings > API in your Supabase project
2. Copy these values:
   - **Project URL** (starts with `https://...supabase.co`)
   - **anon public key** (starts with `eyJhbGc...`)
   - **service_role secret** (keep this secure!)

## Step 6: Deploy Frontend to Vercel

### Option A: Via Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Option B: Via Vercel CLI
```bash
npm install -g vercel
cd frontend
vercel --prod
```

## Step 7: Configure Environment Variables

In Vercel dashboard, go to Project Settings > Environment Variables:

Add these variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

## Step 8: Update Frontend Configuration

Update `frontend/.env.production`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-project.supabase.co
```

## Step 9: Create First Admin User

1. Go to your deployed frontend
2. Sign up with your admin email
3. Go to Supabase dashboard > Authentication > Users
4. Find your user and copy the User UID
5. Go to SQL Editor and run:

```sql
INSERT INTO employees (supabase_user_id, email, first_name, last_name, role, department, hire_date)
VALUES (
    'your-user-uid-here',
    'your-email@company.com',
    'Your',
    'Name',
    'admin',
    'IT',
    CURRENT_DATE
);

-- Create initial leave balances for the admin
INSERT INTO leave_balances (employee_id, leave_type_id, year, allocated_days)
SELECT 
    e.id,
    lt.id,
    EXTRACT(YEAR FROM CURRENT_DATE),
    lt.max_days_per_year
FROM employees e
CROSS JOIN leave_types lt
WHERE e.email = 'your-email@company.com';
```

## Step 10: Test the Deployment

1. Visit your Vercel app URL
2. Sign in with your admin account
3. Verify all features work:
   - Dashboard loads
   - Leave requests can be created
   - Leave balances are displayed
   - User profile works

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your Vercel domain is added to Supabase Auth settings
2. **Database Connection**: Check that RLS policies are set correctly
3. **Environment Variables**: Ensure all VITE_ variables are set in Vercel
4. **Build Failures**: Check that all dependencies are in package.json

### Getting Help:

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- Check browser console for errors
- Check Vercel function logs
- Check Supabase logs in dashboard

## Production Considerations

1. **Database Backups**: Enable automated backups in Supabase
2. **Monitoring**: Set up uptime monitoring
3. **SSL**: Both Vercel and Supabase provide SSL by default
4. **Custom Domain**: Configure custom domain in Vercel
5. **CDN**: Vercel provides global CDN automatically

Your leave management system is now deployed and ready for production use!