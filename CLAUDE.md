# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a leave management system built with Encore.dev (backend) and React + Vite (frontend). The system manages employee leave requests, balances, documents, and includes Auth0 integration for authentication.

## Commands

### Development

Start the backend (Encore):
```bash
cd backend
encore run
```

Start the frontend:
```bash
cd frontend
npm install  # or bun install
npx vite dev
```

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

- Backend services use Encore.dev patterns with `encore.service.ts` files
- Frontend uses absolute imports with `@/` alias pointing to frontend root
- Generated client code is auto-generated and should not be manually edited
- Database migrations are numbered and must be run in sequence

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
1. Add new endpoints in appropriate service files
2. Regenerate frontend client: `encore gen client --target leap`
3. Update TypeScript types in `types.ts` as needed

### Frontend Development
1. Use existing UI components from `components/ui/`
2. Follow established patterns for API calls using generated client
3. Implement proper error handling and loading states
4. Ensure responsive design with Tailwind CSS

### Authentication
- Use Auth0 for new features
- Implement proper role-based access control
- Handle JWT token refresh and expiration

### File Uploads
- Use storage service for document uploads
- Implement proper file validation and security
- Handle file download URLs through storage service endpoints

## API Routes (Updated)

### Company Documents (HR only)
- `POST /company-documents` - Create company document
- `GET /company-documents` - List company documents
- `PUT /company-documents/:id` - Update company document
- `DELETE /company-documents/:id` - Delete company document
- `GET /company-documents/expiring` - Get expiring documents
- `POST /company-documents/upload` - Upload company document file
- `GET /company-documents/:filePath` - Download company document

### Leave Request Documents
- `POST /leave-documents/upload` - Upload leave request document
- `GET /leave-documents/:documentId` - Download leave request document

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