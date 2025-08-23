# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a leave management system built with Encore.dev (backend) and React + Vite (frontend). The system manages employee leave requests, balances, documents, and now uses Supabase for authentication (migrated from Auth0).

## Commands

### Development

**Prerequisites**: Ensure Encore CLI and npm are installed (see DEVELOPMENT.md)

Start the backend (Encore):
```bash
cd backend
encore run
```

Start the frontend:
```bash
cd frontend
npm install
npx vite dev
```

**Important**: This project uses npm workspaces (not bun). The root package.json defines workspaces for both backend and frontend, with packageManager set to "npm@10.5.0".

### Frontend Client Generation

Generate TypeScript client from backend API:
```bash
cd backend
encore gen client --target leap
```

This generates the frontend client that provides type-safe API calls to the backend.

### Build

Build frontend for production:
```bash
cd backend
npm run build  # This builds frontend and places it in backend/frontend/dist
```

**Note**: Build script runs from backend directory but executes `cd ../frontend && rm -rf node_modules && rm -rf dist && rm -rf .vite && npm install --no-cache && npx vite build --outDir=../backend/frontend/dist --emptyOutDir`

### Deployment

#### Encore Cloud
```bash
encore auth login
git remote add encore encore://leave-management-system-99ki
git push encore
```

#### Self-hosting
```bash
encore build docker
```

## Architecture

### Backend (Encore.dev)

- **Framework**: Encore.dev with TypeScript
- **Database**: PostgreSQL with SQL migrations
- **Services**: Modular service architecture

#### Service Structure:
- `leave/` - Core leave management service
  - `auth.ts` - Legacy authentication (deprecated)
  - `supabase_sync.ts` - Supabase integration and user synchronization
  - `employees.ts` - Employee management
  - `leave_requests.ts` - Leave request workflows
  - `leave_balances.ts` - Leave balance management
  - `leave_types.ts` - Leave type definitions
  - `absence_management.ts` - Absence records and conversions
  - `documents.ts` - Document management
  - `reports.ts` - Reporting functionality
  - `notifications.ts` - Email notifications
  - `admin.ts` - Administrative functions
  - `cache.ts` - Caching layer
  - `db.ts` - Database configuration
  - `types.ts` - Shared TypeScript interfaces

- `storage/` - File storage service
  - `company_documents.ts` - Company document storage
  - `documents.ts` - Leave request document storage
  - `profile_images.ts` - Employee profile image storage

#### Database:
- Migration-based schema in `backend/leave/migrations/`
- Main entities: employees, leave_types, employee_leave_balances, leave_requests, leave_documents, absence_records, absence_conversion_requests, company_documents

### Frontend (React + Vite)

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI components
- **State Management**: TanStack Query for server state, React Context for auth/user state
- **Routing**: React Router v7
- **Build Tool**: Vite 6.3.5 with base: '/frontend/' configuration
- **Package Manager**: npm (specified in package.json)

#### Key Components:
- Authentication contexts (AuthContext, UserContext)
- Protected routes with role-based access
- Reusable UI components in `components/ui/`
- Modular page components in `pages/`

#### Pages:
- Dashboard - Overview and quick actions
- LeaveRequests - Manager/HR leave request approval
- MyRequests - Employee's own leave requests
- Reports - Analytics and reporting
- Employees - Employee management (HR)
- Documents - Company document management
- Settings - User preferences and configuration

### Authentication

- **Primary**: Supabase authentication with JWT tokens
- **Legacy**: Built-in email/password auth (deprecated)
- **Roles**: employee, manager, hr with hierarchical permissions

### File Structure Patterns

- **Monorepo Structure**: Root package.json defines workspaces for backend and frontend
- **Backend services**: Use Encore.dev patterns with `encore.service.ts` files
- **Frontend imports**: Uses absolute imports with `@/` alias pointing to frontend root, `~backend/client` for generated client, `~backend` for backend directory
- **Generated client**: `frontend/client.ts` is auto-generated from backend API - DO NOT edit manually
- **Database migrations**: Numbered sequentially in `backend/leave/migrations/` - must be run in order
- **Package Manager**: Project consistently uses npm throughout (packageManager field in package.json)

### Type Safety

- Shared types defined in `backend/leave/types.ts`
- Frontend client auto-generated from backend API definitions
- Strict TypeScript configuration with composite project setup

### State Management

- Server state: TanStack Query with generated client
- Auth state: React Context with Supabase integration
- User preferences: React Context with localStorage persistence
- Theme: React Context for dark/light mode

### Static Asset Serving

Critical for deployment: The frontend is served through Encore's static file serving:
- **Assets Route**: `/frontend/assets/*path` → serves files directly from `dist/assets/` with correct MIME types
- **Frontend Route**: `/frontend/*path` → serves files from `dist/` with HTML fallback
- **Root Fallback**: `/!path` → SPA routing fallback to `dist/index.html`

## Development Guidelines

### Database Changes
1. Create new migration files in `backend/leave/migrations/`
2. Use sequential numbering (e.g., `8_description.up.sql`)
3. Test migrations locally before deploying

### API Development
1. Add new endpoints in appropriate service files (`leave/`, `storage/`)
2. Update TypeScript types in `backend/leave/types.ts` as needed
3. Regenerate frontend client: `encore gen client --target leap`
4. **Important**: Generated client code replaces `frontend/client.ts` - never edit this file manually

### Frontend Development
1. Use existing UI components from `components/ui/` (Radix UI + Tailwind CSS)
2. Follow established patterns for API calls using generated client (`~backend/client`)
3. Implement proper error handling and loading states with TanStack Query
4. Ensure responsive design with Tailwind CSS v4
5. Use npm for package management (`npm install`, `npm add`, etc.)
6. Component structure: Pages in `pages/`, reusable components in `components/`, contexts in `contexts/`

### Authentication
- Use Supabase for new features
- Implement proper role-based access control
- Handle JWT token refresh and expiration

### File Uploads
- Use storage service for document uploads
- Implement proper file validation and security
- Handle file download URLs through storage service endpoints

## Key API Endpoints

**Note**: Complete API routes are auto-generated in `frontend/client.ts`. Main services:

### Leave Management (`backend/leave/`)
- **Leave Requests**: CRUD operations, approval workflows, employee/manager views
- **Leave Balances**: Balance management, allocations, usage tracking  
- **Leave Types**: Annual leave, sick leave, etc. configuration
- **Employees**: User management, role-based access
- **Absence Management**: Absence records and conversion requests
- **Reports**: Analytics and reporting endpoints
- **Notifications**: Email notification system

### Storage Services (`backend/storage/`)
- **Documents**: Leave request document uploads/downloads
- **Company Documents**: HR document management (policies, handbooks)
- **Profile Images**: Employee profile image storage

### Supabase Integration
- **Sync Endpoints**: User synchronization between Supabase and internal database
- **JWT Authentication**: All endpoints require valid Supabase JWT tokens
- **Role-based Access**: employee, manager, hr hierarchical permissions

## Supabase Configuration

Environment variables required for frontend (in `.env.development`):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CLIENT_TARGET=http://localhost:4000
```