# Field and Parameter Reference Guide

This document provides a complete reference of all function parameters, object keys, property accesses, and abbreviations used throughout the Leave Management System codebase.

## Table of Contents

- [Backend Leave Service](#backend-leave-service)
- [Backend Storage Service](#backend-storage-service)
- [Frontend Application](#frontend-application)
- [API Client Methods](#api-client-methods)
- [Common Abbreviations](#common-abbreviations)
- [Environment Variables](#environment-variables)

---

## Backend Leave Service

### Core Entity Parameters

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `employeeId` | number | Employee identifier for absence records and leave operations |
| `supabaseUserId` | string | Supabase user ID for authentication and user synchronization |
| `managerId` | number (optional) | Manager ID for employee hierarchy |
| `leaveTypeId` | number | Leave type identifier (Annual, Sick, Personal, etc.) |
| `absenceRecordId` | number | ID of absence record for conversion requests |

### Date and Time Parameters

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `absenceDate` | Date | Date when absence occurred |
| `startDate` | Date | Leave request start date |
| `endDate` | Date | Leave request end date |
| `expiryDate` | Date (optional) | Document expiry date |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |
| `approvedAt` | Date (optional) | Approval timestamp |

### Request Status and Workflow

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `status` | string | Status of requests ('pending', 'approved', 'rejected') |
| `reason` | string (optional) | Reason for absence or leave request |
| `justification` | string | Justification text for absence conversion |
| `managerComments` | string (optional) | Manager comments on leave/absence requests |
| `approvedBy` | number | ID of user who approved the request |

### Authentication and Authorization

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `auth.role` | string | Authentication role ('hr', 'manager', 'employee') |
| `auth.userID` | string | Authenticated user ID from JWT token |
| `initSecret` | string | Initialization secret for admin user creation |
| `newRole` | 'employee' \| 'manager' \| 'hr' | New role assignment for user |
| `token` | string | JWT token string |
| `decoded.sub` | string | JWT subject claim |
| `decoded.email` | string | JWT email claim |

### Leave Balance Management

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `daysRequested` | number | Number of days requested for leave |
| `allocatedDays` | number | Days allocated for specific leave type |
| `usedDays` | number | Days used from allocation |
| `carriedForwardDays` | number | Days carried forward from previous year |
| `availableDays` | number | Available days remaining in balance |
| `annualAllocation` | number | Annual allocation of days for leave type |
| `carryForwardLimit` | number | Maximum days that can be carried forward |

### Employee Management

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `email` | string | User email address |
| `name` | string | User full name |
| `department` | string | Employee department |
| `password` | string | Employee password |
| `profileImageUrl` | string (optional) | Profile image URL |
| `saltRounds` | number | Bcrypt salt rounds |
| `passwordHash` | string | Hashed password |

### Reporting and Statistics

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `utilizationPercentage` | number | Leave utilization percentage |
| `totalAllocatedDays` | number | Total allocated days |
| `totalUsedDays` | number | Total used days |
| `averageUtilization` | number | Average utilization percentage |
| `totalEmployees` | number | Count of total employees |
| `totalManagers` | number | Count of total managers |
| `totalHR` | number | Count of total HR users |
| `pendingRequests` | number | Count of pending requests |
| `byDepartment` | Array | Breakdown by department |
| `byLeaveType` | Array | Breakdown by leave type |

---

## Backend Storage Service

### File Upload Parameters

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `filePath` | string | Path parameter for file location in storage bucket |
| `filename` | string | Original name of uploaded file |
| `fileData` | string | Base64 encoded file content for upload |
| `documentId` | string | Unique identifier for stored document |
| `leaveRequestId` | number | ID linking document to specific leave request |

### Document Management

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `documentType` | string | Category/type of document ('license', 'certificate', 'policy', 'other') |
| `description` | string (optional) | Document description |
| `fileSize` | number | File size in bytes |
| `uploadedBy` | number | ID of user who uploaded the document |

### Storage Configuration

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `downloadUrl` | string | Signed URL for downloading files |
| `imageUrl` | string | Public URL for accessing profile image |
| `contentType` | string | MIME type for file upload configuration |
| `ttl` | number | Time To Live - expiration time for signed URLs (3600 seconds) |
| `public` | boolean | Bucket configuration for public access |

### Storage Buckets

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `company-documents` | string | Storage bucket name for company policy documents |
| `leave-documents` | string | Storage bucket name for leave request documents |
| `profile-images` | string | Storage bucket name for employee profile pictures |

### File Extensions and Types

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `pdf` | string | Portable Document Format |
| `doc/docx` | string | Microsoft Word document formats |
| `xls/xlsx` | string | Microsoft Excel spreadsheet formats |
| `jpg/jpeg/png/gif/webp` | string | Supported image formats |
| `txt` | string | Plain text file format |

---

## Frontend Application

### Authentication State

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `currentUser` | Employee | Current logged-in employee data |
| `supabaseUser` | User | Supabase user authentication object |
| `session` | Session | Supabase authentication session |
| `isLoading` | boolean | Loading state for authentication operations |
| `isAuthenticated` | boolean | Whether user is currently authenticated |
| `access_token` | string | JWT token from session for API authentication |
| `fetchEmployeeData` | Function | Async function to fetch employee data from backend |

### API State Management

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `queryClient` | QueryClient | TanStack Query client for API state management |
| `staleTime` | number | Cache invalidation time (5 minutes) |
| `gcTime` | number | Garbage collection time for cached data (10 minutes) |
| `retry` | number | Number of retry attempts for failed queries |
| `refetchOnWindowFocus` | boolean | Whether to refetch data when window gains focus |
| `queryKey` | Array | Unique identifier for cached query data |
| `queryFn` | Function | Function that fetches data for the query |
| `mutationFn` | Function | Function that performs mutation operation |
| `invalidateQueries` | Function | Function to refresh cached query data |

### UI State Management

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `theme` | 'light' \| 'dark' | Current UI theme preference |
| `setTheme` | Function | Function to set theme preference |
| `toggleTheme` | Function | Function to toggle between themes |
| `open` | boolean | Dialog/modal visibility state |
| `onOpenChange` | Function | Callback for dialog visibility changes |
| `showCreateDialog` | boolean | Whether create dialog is visible |
| `showEditBalanceDialog` | boolean | Whether edit balance dialog is visible |

### Form Management

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `formData` | object | Form state containing all input values |
| `selectedFile` | File | Uploaded supporting document |
| `handleSubmit` | Function | Form submission handler |
| `handleFileChange` | Function | File input change handler |
| `resetForm` | Function | Function to reset form to initial state |
| `value` | string/number | Current input value |
| `onChange` | Function | Input change handler |
| `placeholder` | string | Placeholder text for inputs |

### Component Props

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `variant` | string | Component style variant |
| `size` | string | Component size variant |
| `className` | string | CSS class names for styling |
| `children` | ReactNode | Child components or content |
| `asChild` | boolean | Whether to render as child component |
| `disabled` | boolean | Whether component is disabled |
| `onClick` | Function | Click event handler |
| `onSelect` | Function | Selection change handler |

### Data Display

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `employees` | object | List of all employees |
| `pendingRequests` | object | Leave requests awaiting approval |
| `balances` | object | Employee leave balances data |
| `selectedEmployee` | object | Currently selected employee for operations |
| `recentRequests` | Array | Latest leave requests for display |
| `leaveTypes` | Array | Available leave types for selection |
| `selectedBalance` | object | Balance info for selected leave type |

### Calendar and Date Components

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `mode` | string | Calendar selection mode ('single', 'multiple', etc.) |
| `selected` | Date | Currently selected date |
| `initialFocus` | boolean | Whether calendar should focus on mount |
| `format` | Function | Date formatting function from date-fns |
| `calculateBusinessDays` | Function | Function to calculate business days between dates |

### Toast Notifications

| Field / Parameter Name | Type | Purpose / Description |
|------------------------|------|----------------------|
| `title` | ReactNode | Toast title content |
| `description` | ReactNode | Toast description content |
| `variant` | string | Toast variant ('default', 'destructive') |
| `dismiss` | Function | Function to dismiss toast |
| `update` | Function | Function to update toast content |
| `TOAST_LIMIT` | number | Maximum number of simultaneous toasts |
| `TOAST_REMOVE_DELAY` | number | Delay before removing toast from memory |

---

## API Client Methods

### Leave Management

| Method Name | Parameters | Purpose / Description |
|-------------|------------|----------------------|
| `createLeaveRequest` | `{ employeeId, leaveTypeId, startDate, endDate, reason? }` | Create new leave request |
| `updateLeaveRequestStatus` | `{ id, status, approvedBy?, managerComments? }` | Update leave request approval status |
| `listLeaveRequests` | `{ employeeId?, managerId?, status? }` | List leave requests with filtering |
| `getEmployeeBalances` | `{ employeeId }` | Retrieve employee leave balances |
| `listLeaveTypes` | `{}` | Get all available leave types |

### Employee Management

| Method Name | Parameters | Purpose / Description |
|-------------|------------|----------------------|
| `createEmployee` | `{ email, name, department, role?, managerId?, password }` | Create new employee |
| `listEmployees` | `{}` | List all employees |
| `getEmployee` | `{ id }` | Get employee by ID |
| `updateEmployeeProfile` | `{ id, name?, department?, profileImageUrl? }` | Update employee profile |
| `updateUserRole` | `{ employeeId, newRole }` | Update user role |

### Authentication

| Method Name | Parameters | Purpose / Description |
|-------------|------------|----------------------|
| `getUser` | `{ supabaseUserId }` | Get user by Supabase ID |
| `syncUser` | `{ supabaseUserId, email?, name?, department?, role?, managerId? }` | Synchronize user from Supabase |
| `login` | `{ email, password }` | User login with credentials |

### Document Management

| Method Name | Parameters | Purpose / Description |
|-------------|------------|----------------------|
| `createDocument` | `{ name, description?, documentType, filePath, fileSize, expiryDate? }` | Create company document |
| `listDocuments` | `{ documentType? }` | List company documents |
| `updateDocument` | `{ id, name?, description?, expiryDate? }` | Update document metadata |
| `deleteDocument` | `{ id }` | Delete document |
| `uploadDocument` | `{ filename, fileData, leaveRequestId }` | Upload leave request document |
| `uploadCompanyDocument` | `{ filename, fileData, documentType }` | Upload company document |

### Absence Management

| Method Name | Parameters | Purpose / Description |
|-------------|------------|----------------------|
| `createAbsenceRecord` | `{ employeeId, absenceDate, reason?, createdBy }` | Create absence record |
| `listAbsenceRecords` | `{ employeeId?, status? }` | List absence records |
| `createAbsenceConversionRequest` | `{ absenceRecordId, justification, createdBy }` | Create absence conversion request |
| `updateAbsenceConversionStatus` | `{ id, status, approvedBy?, managerComments? }` | Update conversion request status |

### Reporting and Analytics

| Method Name | Parameters | Purpose / Description |
|-------------|------------|----------------------|
| `getLeaveUsageReport` | `{ year?, department? }` | Get leave usage analytics |
| `getPendingRequestsSummary` | `{}` | Get pending requests summary for managers |
| `getAdminStats` | `{}` | Get admin dashboard statistics |
| `getSystemHealth` | `{}` | Get system health status |

### Notifications

| Method Name | Parameters | Purpose / Description |
|-------------|------------|----------------------|
| `checkExpiringDocuments` | `{}` | Check for documents expiring soon |
| `sendExpiryNotification` | `{ documentId, recipientEmail }` | Send document expiry notification |

---

## Common Abbreviations

### Technical Abbreviations

| Abbreviation | Full Form | Purpose / Description |
|--------------|-----------|----------------------|
| `req` | request | Request object containing API parameters |
| `auth` | authentication | Authentication context/data |
| `params` | parameters | Query parameters for API filtering |
| `id` | identifier | Generic identifier field |
| `url` | Uniform Resource Locator | Web address or API endpoint |
| `ttl` | Time To Live | Expiration setting for cached data or URLs |
| `jwt` | JSON Web Token | Authentication token format |
| `api` | Application Programming Interface | Backend service interface |
| `db` | database | Database connection or operations |
| `sql` | Structured Query Language | Database query language |

### Business Domain Abbreviations

| Abbreviation | Full Form | Purpose / Description |
|--------------|-----------|----------------------|
| `hr` | Human Resources | Human Resources department/role |
| `mgr` | manager | Manager role abbreviation |
| `emp` | employee | Employee role abbreviation |
| `dept` | department | Department field abbreviation |
| `bal` | balance | Leave balance abbreviation |
| `req` | request | Leave request abbreviation |
| `conv` | conversion | Absence conversion abbreviation |

### Frontend Utility Abbreviations

| Abbreviation | Full Form | Purpose / Description |
|--------------|-----------|----------------------|
| `cn` | className | Class name utility function (clsx + tailwind-merge) |
| `ui` | user interface | UI component directory |
| `ctx` | context | React context abbreviation |
| `fn` | function | Function parameter abbreviation |
| `env` | environment | Environment variables |
| `cfg` | configuration | Configuration settings |

---

## Environment Variables

### Frontend Environment Variables

| Variable Name | Type | Purpose / Description |
|---------------|------|----------------------|
| `VITE_SUPABASE_URL` | string | Supabase project URL for frontend authentication |
| `VITE_SUPABASE_ANON_KEY` | string | Supabase anonymous key for client-side auth |
| `VITE_CLIENT_TARGET` | string | Backend API endpoint URL |

### Backend Environment Variables

| Variable Name | Type | Purpose / Description |
|---------------|------|----------------------|
| `NODE_ENV` | string | Environment mode ('development', 'production') |
| `API_BASE_URL` | string | Base URL for API services |
| `ENCORE_PORT` | string | Port number for Encore backend service |

---

## Usage Guidelines

### When to Use This Reference

1. **Code Reviews** - Verify parameter naming consistency
2. **API Integration** - Understand required and optional parameters
3. **Frontend Development** - Reference component props and state variables
4. **Backend Development** - Check database field names and API parameters
5. **Documentation** - Create accurate technical documentation
6. **Onboarding** - Help new developers understand codebase conventions

### Naming Conventions

- **camelCase** for JavaScript/TypeScript variables and functions
- **PascalCase** for React components and TypeScript types
- **kebab-case** for CSS classes and HTML attributes
- **UPPER_SNAKE_CASE** for constants and environment variables
- **snake_case** for database column names (following SQL conventions)

### Best Practices

1. Use descriptive parameter names that clearly indicate their purpose
2. Include type information and optional/required status
3. Group related parameters in objects when possible
4. Use consistent abbreviations across the codebase
5. Document complex parameter structures with examples

---

*Last Updated: December 2024*
*Version: 1.0*