# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a leave management system built with Encore.dev (backend) and React + Vite (frontend). The system manages employee leave requests, balances, documents, and includes Auth0 integration for authentication.

## Commands

### Development

**Prerequisites**: Ensure Encore CLI and bun are installed (see DEVELOPMENT.md)

Start the backend (Encore):
```bash
cd backend
encore run
```

Start the frontend:
```bash
cd frontend
bun install  # Project uses bun as package manager
bun run dev  # or npx vite dev
```

**Note**: This is a monorepo using bun workspaces. The root package.json defines workspaces for both backend and frontend.

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
bun run build  # This builds frontend and places it in backend/frontend/dist
```

**Note**: Build script runs from backend directory but executes `cd ../frontend && bun install && vite build --outDir=../backend/frontend/dist`

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
  - `auth.ts` - Authentication (deprecated, Auth0 is primary)
  - `auth0_sync.ts` - Auth0 integration and user synchronization
  - `employees.ts` - Employee management
  - `leave_requests.ts` - Leave request workflows
  - `leave_balances.ts` - Leave balance management
  - `leave_types.ts` - Leave type definitions
  - `absence_management.ts` - Absence records and conversions
  - `documents.ts` - Document management
  - `reports.ts` - Reporting functionality
  - `notifications.ts` - Email notifications
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

- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI components
- **State Management**: TanStack Query for server state, React Context for auth/user state
- **Routing**: React Router v7
- **Build Tool**: Vite
- **Package Manager**: bun (specified in package.json)

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

- **Primary**: Auth0 integration with JWT tokens
- **Legacy**: Built-in email/password auth (deprecated)
- **Roles**: employee, manager, hr with hierarchical permissions

### File Structure Patterns

- **Monorepo Structure**: Root package.json defines workspaces for backend and frontend
- **Backend services**: Use Encore.dev patterns with `encore.service.ts` files
- **Frontend imports**: Uses absolute imports with `@/` alias pointing to frontend root, `~backend/client` for generated client, `~backend` for backend directory
- **Generated client**: `frontend/client.ts` is auto-generated from backend API - DO NOT edit manually
- **Database migrations**: Numbered sequentially in `backend/leave/migrations/` - must be run in order
- **Package Manager**: Project consistently uses bun throughout (packageManager field in package.json)

### Type Safety

- Shared types defined in `backend/leave/types.ts`
- Frontend client auto-generated from backend API definitions
- Strict TypeScript configuration with composite project setup

### State Management

- Server state: TanStack Query with generated client
- Auth state: React Context with Auth0 integration
- User preferences: React Context with localStorage persistence
- Theme: React Context for dark/light mode

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
5. Use bun for package management (`bun install`, `bun add`, etc.)
6. Component structure: Pages in `pages/`, reusable components in `components/`, contexts in `contexts/`

### Authentication
- Use Auth0 for new features
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

### Auth0 Integration
- **Sync Endpoints**: User synchronization between Auth0 and internal database
- **JWT Authentication**: All endpoints require valid Auth0 JWT tokens
- **Role-based Access**: employee, manager, hr hierarchical permissions

## Auth0 Configuration Required

To fix deployment issues, ensure proper Auth0 setup:

1. **Create Auth0 Application**: SPA for frontend, API for backend
2. **Set Audience**: Must match the `Auth0Audience` secret in Encore
3. **Configure Domains**: Set allowed callback/logout URLs
4. **Custom Claims**: Add user metadata to tokens

### Auth0 CLI Setup Commands:
```bash
./auth0 login --domain <your-tenant>.auth0.com --client-id <client-id> --client-secret <client-secret>
./auth0 apis list  # Check current API audience
./auth0 apps list  # Check SPA configuration
```

### Required Encore Secrets:
```bash
encore secret set Auth0Domain <your-tenant>.auth0.com
encore secret set Auth0Audience <your-api-identifier>
```

### Auth0 Custom Claims Rule:
```javascript
function addCustomClaims(user, context, callback) {
  const namespace = 'https://yourapp.com/';
  context.idToken[namespace + 'role'] = user.app_metadata.role || 'employee';
  context.idToken[namespace + 'employee_id'] = user.app_metadata.employee_id;
  context.accessToken[namespace + 'role'] = user.app_metadata.role || 'employee';
  context.accessToken[namespace + 'employee_id'] = user.app_metadata.employee_id;
  callback(null, user, context);
}
```