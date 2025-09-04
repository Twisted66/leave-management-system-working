# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack leave management system built with:
- **Backend**: Encore.ts framework with TypeScript services and PostgreSQL database
- **Frontend**: React SPA with Vite, TypeScript, Tailwind CSS, and Radix UI components
- **Authentication**: Supabase Auth with JWT tokens synced to internal database
- **Deployment**: Encore Cloud Platform with static frontend serving

### Project Structure
- `backend/` - Encore.ts services, database migrations, and frontend static serving
- `frontend/` - React SPA with modern component architecture
- `backend/frontend/dist/` - Production frontend files served by Encore
- `tests/` - Playwright end-to-end tests

## Development Commands

### Starting Services
```bash
# Backend (Encore.ts server at localhost:4000)
cd backend && encore run

# Frontend dev server (localhost:5173)
cd frontend && npx vite dev

# Frontend via backend (localhost:4000/frontend/)
# Production-like setup for testing
```

### Building
```bash
# Frontend only
cd frontend && npm run build

# Full production build (builds frontend → copies to backend)
cd backend && npm run build

# Type checking without building
cd frontend && npm run build:check
```

### Testing
```bash
# All Playwright tests (auto-starts backend)
npm test

# Specific test suites
npm run test:smoke          # Quick verification
npm run test:spa           # SPA functionality
npx playwright test tests/auth-setup.spec.ts     # Auth environment
npx playwright test tests/auth-integration.spec.ts   # Full auth flow

# With browser UI
npm run test:headed

# Debug mode
npm run test:debug
```

### Database Operations
```bash
cd backend

# Run migrations
encore db migrate

# Generate frontend API client
encore gen client --target leap
```

## Key Architecture Patterns

### Frontend Static Serving
The frontend is built by Vite and served as static files by Encore at `/frontend/*` routes. The backend service `backend/frontend/encore.service.ts` handles:
- Asset serving (`/frontend/assets/*`)
- SPA routing fallbacks (`/frontend/*path` → `index.html`)
- MIME type corrections for deployment

### Authentication Flow
1. Frontend uses Supabase Auth for login/signup
2. JWT token from Supabase sent to backend APIs via Authorization header
3. Backend validates JWT and syncs user to internal PostgreSQL database
4. All API calls require valid JWT token

### Database Schema
Located in `backend/leave/migrations/` with numbered SQL files. Main entities:
- `employees` - User profiles synced from Supabase
- `leave_types` - Annual leave, sick leave, etc.
- `leave_balances` - Employee allocations per year
- `leave_requests` - Leave applications with approval workflow
- `absence_records` - Unplanned absences with conversion options
- `documents` - File attachments for requests

### Component Architecture
- `frontend/components/ui/` - Reusable Radix UI components
- `frontend/components/` - Business logic components and dialogs
- `frontend/pages/` - Route-level page components
- `frontend/contexts/` - React contexts for auth, theme, user state
- `frontend/hooks/` - Custom hooks for API integration

## Development Workflow

### Adding New Features
1. Backend: Add service endpoint in `backend/leave/[service].ts`
2. Database: Create migration if schema changes needed
3. Regenerate client: `encore gen client --target leap`
4. Frontend: Use generated client in React components
5. Test: Add Playwright tests for critical paths

### Environment Configuration
- `frontend/.env.development` - Frontend dev environment variables
- `frontend/.env.production` - Production build variables
- Backend environment variables set in Encore Cloud dashboard

### File Upload Handling
The system uses Encore's storage services:
- `backend/storage/documents.ts` - Leave request attachments
- `backend/storage/profile_images.ts` - Employee profile photos
- `backend/storage/company_documents.ts` - HR documents

### API Client Usage
Frontend uses generated TypeScript client with automatic environment detection:
- Development: `http://localhost:4000`
- Production: Auto-detects from hostname (`*.encr.app` domains)

## Deployment

### Git Repository
- **GitHub**: https://github.com/Twisted66/leave-management-system
- **Encore Remote**: encore://leave-management-system-99ki

### Deployment Workflow
```bash
# Deploy via GitHub (triggers automatic Encore deployment)
git push origin main

# Direct Encore deployment
git push encore main
```

Both GitHub and Encore git pushes will trigger deployment to Encore Cloud Platform.

## Important Development Notes

- Frontend builds to `backend/frontend/dist/` for production serving
- TypeScript compilation separated from Vite build to avoid backend file conflicts
- Encore automatically handles CORS and serves frontend at `/frontend/` base path
- Authentication state managed through React Context with Supabase integration
- Database migrations use sequential numbering (1_, 2_, etc.)