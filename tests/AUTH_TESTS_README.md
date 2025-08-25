# Supabase Authentication Integration Tests

This test suite provides comprehensive testing of the Supabase authentication integration in the Leave Management System, covering the complete authentication flow between the React frontend and Encore.dev backend.

## Overview

The authentication system consists of:
- **Frontend**: React SPA with Supabase Auth SDK
- **Backend**: Encore.dev API with JWT token validation
- **Database**: PostgreSQL with user synchronization
- **Authentication**: Supabase Auth with custom JWT validation

## Test Files

### `auth-setup.spec.ts`
Environment verification and setup tests that ensure:
- Encore server is running and accessible
- Frontend static assets are served correctly
- Backend API endpoints are accessible
- Supabase integration is configured
- Database connectivity works
- JWT token validation is functioning
- Routing configuration is correct
- Test user credentials are available

### `auth-integration.spec.ts`
Comprehensive authentication integration tests covering:

#### Core Authentication Flow
- ✅ Login form display for unauthenticated users
- ✅ Invalid credential handling with error messages
- ✅ Successful authentication with valid Supabase credentials
- ✅ JWT token extraction and validation
- ✅ Backend auth endpoint access with valid tokens
- ✅ User synchronization between Supabase and backend database

#### Security & Protection
- ✅ Protected route access control (redirects to login)
- ✅ Authentication state persistence across page refreshes
- ✅ Logout functionality and state clearing
- ✅ Expired/invalid token handling
- ✅ Unauthorized request rejection
- ✅ Role-based access control verification

#### Performance Testing
- ✅ Login completion within reasonable time limits
- ✅ Concurrent authentication request handling

## Prerequisites

### 1. Environment Setup
- Encore server running on `http://localhost:4000`
- Supabase project configured with proper JWT keys
- Database migrations completed
- Test user available in both Supabase and backend database

### 2. Test User Configuration
The tests expect a test user with these credentials:
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Supabase User ID**: `eb49b337-d813-421b-ba5a-d7519e89b7f4`
- **Role**: `hr` (for role-based access testing)

### 3. Required Dependencies
```bash
npm install @playwright/test
```

## Running the Tests

### Option 1: Using Test Runner Scripts
```bash
# Windows Command Prompt
./run-auth-tests.bat

# PowerShell/Cross-platform
./run-auth-tests.ps1
```

### Option 2: Manual Execution
```bash
# Run setup verification first
npx playwright test tests/auth-setup.spec.ts --reporter=list

# Run main authentication tests
npx playwright test tests/auth-integration.spec.ts --reporter=list --timeout=60000

# Generate HTML report
npx playwright show-report
```

### Option 3: Individual Test Categories
```bash
# Just the environment setup tests
npx playwright test tests/auth-setup.spec.ts

# Just the integration tests
npx playwright test tests/auth-integration.spec.ts

# Run with specific browser
npx playwright test tests/auth-integration.spec.ts --project=chromium
```

## Test Configuration

The tests are configured to work with:
- **Base URL**: `http://127.0.0.1:4000`
- **Timeout**: 60 seconds for auth operations
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Reports**: HTML, JSON, and console output

## Understanding Test Results

### ✅ Success Indicators
- All authentication flows complete successfully
- JWT tokens are properly validated
- Protected routes redirect correctly
- User data synchronization works
- Role-based access control functions

### ❌ Common Failure Scenarios

#### 1. Server Not Running
```
ERROR: Encore server is not running on localhost:4000
```
**Solution**: Start the backend server with `cd backend && encore run`

#### 2. Test User Not Found
```
❌ Invalid email or password
```
**Solution**: Ensure test user is created in both Supabase and backend database

#### 3. JWT Validation Failures
```
❌ Token validation failed
```
**Solution**: Check Supabase JWT signing keys and JWKS endpoint configuration

#### 4. Database Connection Issues
```
❌ User not found in the system
```
**Solution**: Run database migrations and verify user exists in employees table

#### 5. CORS or Network Issues
```
❌ Failed to fetch
```
**Solution**: Check CORS configuration and network connectivity

## Test Coverage

### Authentication Flow Coverage
- [x] Login form validation
- [x] Credential verification
- [x] Session management
- [x] Token extraction and validation
- [x] Automatic redirects
- [x] Logout functionality

### Security Coverage
- [x] Unauthorized access prevention
- [x] Token expiration handling
- [x] Invalid token rejection
- [x] Role-based access control
- [x] CSRF protection (implicit)
- [x] XSS prevention (implicit)

### Integration Coverage
- [x] Frontend ↔ Supabase Auth
- [x] Frontend ↔ Backend API
- [x] Supabase ↔ Backend Database
- [x] JWT validation pipeline
- [x] User synchronization
- [x] Error handling

### Performance Coverage
- [x] Login speed benchmarking
- [x] Concurrent request handling
- [x] Token validation performance
- [x] Page load with authentication

## Debugging Failed Tests

### 1. Enable Debug Mode
```bash
DEBUG=pw:* npx playwright test tests/auth-integration.spec.ts
```

### 2. Run in Headed Mode
```bash
npx playwright test tests/auth-integration.spec.ts --headed
```

### 3. Step-by-Step Debugging
```bash
npx playwright test tests/auth-integration.spec.ts --debug
```

### 4. Check Test Screenshots and Videos
Failed tests automatically capture:
- Screenshots in `test-results/`
- Videos in `test-results/`
- Console logs in HTML report

### 5. Inspect Network Traffic
The tests capture all network requests. Check the HTML report for:
- Failed API calls
- Authentication header issues
- Response codes and timing

## Extending the Tests

### Adding New Authentication Scenarios
1. Create new test cases in `auth-integration.spec.ts`
2. Use existing helper functions for common operations
3. Follow the pattern of setup → action → verification

### Testing Additional User Roles
1. Add test users with different roles to your test data
2. Create role-specific test cases
3. Verify access control for each role level

### Adding Performance Tests
1. Use `Date.now()` for timing measurements
2. Set reasonable performance thresholds
3. Test both success and failure scenarios

## Troubleshooting Guide

### Test Environment Issues
| Issue | Symptoms | Solution |
|-------|----------|----------|
| Server not running | Connection refused errors | Start Encore server |
| Missing test user | Authentication failures | Create test user in Supabase & DB |
| JWT configuration | Token validation errors | Check Supabase JWT settings |
| Database issues | User sync failures | Run migrations, check connectivity |
| CORS problems | Fetch failures | Configure CORS in backend |

### Common Test Failures
| Test | Failure Reason | Fix |
|------|---------------|-----|
| Login form display | React app not loading | Check static file serving |
| Authentication success | Invalid credentials | Verify test user setup |
| JWT token handling | Token format issues | Check Supabase configuration |
| Protected routes | Routing problems | Verify React Router setup |
| Backend integration | API endpoint issues | Check auth handler configuration |

## Maintenance

### Regular Maintenance Tasks
1. **Update test credentials** when they expire
2. **Refresh JWT signing keys** if they rotate
3. **Update test data** when user schema changes
4. **Monitor test performance** and adjust timeouts
5. **Review error patterns** for system improvements

### Updating Tests for New Features
1. Add tests for new authentication methods
2. Update role-based tests when roles change
3. Test new protected routes as they're added
4. Verify new security measures are working

## Contributing

When adding new authentication tests:
1. Follow the existing test structure and patterns
2. Include both success and failure scenarios
3. Add appropriate assertions and error messages
4. Update this documentation
5. Ensure tests are independent and can run in any order