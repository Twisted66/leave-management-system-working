# Admin User Setup for Supabase

## 1. Create Admin User in Supabase

Since the admin user needs to exist in both Supabase Auth and the internal database, follow these steps:

### Option A: Create via Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Email: `admin@example.com`
4. Password: `admin123`
5. Confirm password: `admin123`
6. Click "Create User"

### Option B: Create via SQL (Advanced)
If you have access to Supabase SQL editor:

```sql
-- This creates the user in auth.users table
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at)
VALUES 
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@example.com', crypt('admin123', gen_salt('bf')), now(), '', '', '', '', '{}', '{}', false, now(), now(), null, null, '', '', null, '', 0, null, '', null);
```

## 2. Update Backend Auth Handler

The auth handler needs to be updated to properly handle HR roles and set the correct department for admin users.

## 3. CORS and Security Policies

### Backend CORS Configuration
Add proper CORS headers in the backend configuration.

### Database Row Level Security (RLS)
Set up proper RLS policies for the employees table to ensure proper access control.

## 4. Testing
1. Clear browser cache/localStorage
2. Try logging in with admin@example.com / admin123
3. Verify HR-level access to all pages (Dashboard, Reports, Employees, Documents)

## 5. After Setup
Once the admin user is working, you can:
- Create additional HR/Manager users
- Set up proper organizational hierarchy
- Configure department-specific access controls