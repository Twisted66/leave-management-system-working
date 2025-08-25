# Playwright Tests for Leave Management System

This directory contains end-to-end tests for the React-based leave management system served through Encore.dev.

## Test Files

### `smoke.spec.ts`
Quick smoke tests to verify basic functionality:
- App loads and renders correctly
- Static files are served properly
- Basic SPA functionality works

### `spa-frontend.spec.ts`
Comprehensive SPA tests covering:
- Main page loading through Encore.dev static serving
- Client-side routing (React Router) functionality
- Static asset loading (CSS, JS files)
- SPA navigation without page refreshes
- Direct URL access (deep linking)
- Error handling and resilience
- Responsive design on mobile
- Production asset loading workaround

### `auth-setup.spec.ts`
Environment verification and authentication setup tests:
- Encore server accessibility verification
- Frontend static asset serving validation
- Backend API endpoint connectivity
- Supabase integration configuration check
- Database connectivity and test user verification
- JWT token validation testing
- Protected route configuration verification

### `auth-integration.spec.ts`
Comprehensive Supabase authentication integration tests:
- **Login Flow**: Form display, credential validation, success/error handling
- **JWT Token Handling**: Token extraction, validation, structure verification
- **Protected Routes**: Access control and redirect functionality
- **Backend Integration**: Authenticated API calls and user synchronization
- **Session Management**: Persistence across refreshes, logout functionality
- **Security Testing**: Invalid/expired token handling, unauthorized access prevention
- **Role-based Access**: Permission verification for different user roles
- **Performance Testing**: Login timing and concurrent authentication

## Running Tests

### Prerequisites
1. Ensure the Encore.dev backend is running:
   ```bash
   cd backend && encore run
   ```
   The server should be accessible at `http://localhost:4000`

### Available Test Commands

```bash
# Run all tests
npm test

# Run only smoke tests (quick verification)
npm run test:smoke

# Run comprehensive SPA tests
npm run test:spa

# Run authentication tests
./run-auth-tests.bat        # Windows
./run-auth-tests.ps1        # PowerShell/Cross-platform

# Run individual test suites
npx playwright test tests/auth-setup.spec.ts     # Environment verification
npx playwright test tests/auth-integration.spec.ts  # Full auth integration

# Run tests with browser UI visible (for debugging)
npm run test:headed

# Run tests in debug mode (step through tests)
npm run test:debug

# View test report after running tests
npm run test:report
```

### Test Configuration

The tests are configured in `playwright.config.ts` with:
- **Base URL**: `http://localhost:4000` (Encore.dev default)
- **Auto-server**: Automatically starts `encore run` before tests
- **Multi-browser**: Tests run on Chrome, Firefox, Safari, and mobile viewports
- **Timeouts**: 30s per test, 2 minutes for server startup
- **Reports**: HTML report, JSON results, and console output

### Key Test Scenarios

1. **SPA Routing**: Verifies React Router works with basename="/frontend"
2. **Asset Loading**: Checks that Vite-built assets load correctly
3. **Production Workaround**: Tests the dynamic asset loading for Encore deployment
4. **Mobile Responsive**: Ensures the app works on mobile devices
5. **Error Handling**: Verifies graceful handling of navigation errors

## Troubleshooting

### Server Not Starting
If tests fail because server won't start:
```bash
cd backend
encore run
# Wait for "Starting development server on http://localhost:4000"
```

### Port Conflicts
If port 4000 is in use, update `playwright.config.ts` baseURL and webServer.url

### Asset Loading Issues
The tests include checks for the production asset loading workaround implemented in `index.html`. This handles MIME type issues when deployed to Encore.dev.

## Test Reports

After running tests, view results:
- Console output shows pass/fail status
- HTML report: `./test-results/html-report/index.html`
- JSON results: `./test-results/results.json`
- Screenshots/videos of failures in `./test-results/`