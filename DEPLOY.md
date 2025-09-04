# Quick Deployment Guide

## 🚀 One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Twisted66/leave-management-system&project-name=leave-management-system&repository-name=leave-management-system&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Supabase%20credentials%20needed&envLink=https://supabase.com/docs/guides/getting-started)

## 📋 Quick Setup Steps

### 1. Deploy Frontend (30 seconds)
```bash
./deploy.sh
```

### 2. Set up Supabase Backend (5 minutes)
1. Create account at [supabase.com](https://supabase.com)
2. Click "New Project"
3. Copy the SQL from `DEPLOYMENT_GUIDE.md` → Run in SQL Editor
4. Get your project URL and anon key
5. Add them to Vercel environment variables

### 3. Configure Auth (2 minutes)
1. In Supabase dashboard: Authentication → Settings
2. Add your Vercel domain to "Site URL"
3. Enable email confirmations (optional)

### 4. Create Admin User (1 minute)
1. Sign up on your deployed app
2. Copy your user ID from Supabase dashboard
3. Run the admin SQL from `DEPLOYMENT_GUIDE.md`

## 🎉 Done!
Your leave management system is now live and ready to use.

**Need help?** See the detailed `DEPLOYMENT_GUIDE.md` for troubleshooting.

## 🔧 Local Development
```bash
# Backend (if using Encore locally)
cd backend && encore run

# Frontend 
cd frontend && npm run dev
```

## 📚 Documentation
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete setup instructions
- [Development Guide](./DEVELOPMENT.md) - Local development setup
- [CLAUDE.md](./CLAUDE.md) - Architecture and development workflow