# API Reference Documentation

Complete API reference for the Leave Management System backend services.

## Table of Contents

- [Authentication](#authentication)
- [Leave Management API](#leave-management-api)
- [Employee Management API](#employee-management-api)
- [Document Management API](#document-management-api)
- [Storage API](#storage-api)
- [Admin API](#admin-api)
- [Reporting API](#reporting-api)
- [Error Handling](#error-handling)

---

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### `POST /auth/login`
Login with email and password.

**Parameters:**
```typescript
{
  email: string;
  password: string;
}
```

#### `GET /auth/user/:supabaseUserId`
Get user information by Supabase user ID.

**Parameters:**
- `supabaseUserId` (path): Supabase user identifier

#### `POST /auth/sync-user`
Sync user from Supabase to internal database.

**Parameters:**
```typescript
{
  supabaseUserId: string;
  email?: string;
  name?: string;
  department?: string;
  role?: 'employee' | 'manager' | 'hr';
  managerId?: number;
}
```

---

## Leave Management API

### Leave Requests

#### `POST /leave-requests`
Create a new leave request.

**Parameters:**
```typescript
{
  employeeId: number;
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  reason?: string;
}
```

**Response:**
```typescript
{
  id: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  daysRequested: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: Date;
}
```

#### `GET /leave-requests`
List leave requests with optional filtering.

**Query Parameters:**
- `employeeId?: number` - Filter by employee
- `managerId?: number` - Filter by manager
- `status?: string` - Filter by status

#### `PUT /leave-requests/:id/status`
Update leave request status (approval/rejection).

**Parameters:**
```typescript
{
  status: 'approved' | 'rejected';
  approvedBy?: number;
  managerComments?: string;
}
```

### Leave Types

#### `GET /leave-types`
Get all available leave types.

**Response:**
```typescript
{
  leaveTypes: Array<{
    id: number;
    name: string;
    annualAllocation: number;
    carryForwardLimit: number;
    createdAt: Date;
  }>;
}
```

### Leave Balances

#### `GET /employees/:employeeId/balances`
Get leave balances for an employee.

**Response:**
```typescript
{
  balances: Array<{
    leaveTypeId: number;
    leaveTypeName: string;
    year: number;
    allocatedDays: number;
    usedDays: number;
    carriedForwardDays: number;
    availableDays: number;
  }>;
}
```

#### `PUT /balances`
Update employee leave balance.

**Parameters:**
```typescript
{
  employeeId: number;
  leaveTypeId: number;
  allocatedDays?: number;
  carriedForwardDays?: number;
}
```

---

## Employee Management API

#### `POST /employees`
Create a new employee.

**Parameters:**
```typescript
{
  email: string;
  name: string;
  department: string;
  role?: 'employee' | 'manager' | 'hr';
  managerId?: number;
  password: string;
}
```

#### `GET /employees`
List all employees.

**Response:**
```typescript
{
  employees: Array<{
    id: number;
    email: string;
    name: string;
    department: string;
    role: string;
    managerId?: number;
    profileImageUrl?: string;
    createdAt: Date;
  }>;
}
```

#### `GET /employees/:id`
Get employee by ID.

#### `PUT /employees/:id/profile`
Update employee profile.

**Parameters:**
```typescript
{
  name?: string;
  department?: string;
  profileImageUrl?: string;
}
```

---

## Document Management API

#### `POST /company-documents`
Create a company document.

**Parameters:**
```typescript
{
  name: string;
  description?: string;
  documentType: 'license' | 'certificate' | 'policy' | 'other';
  filePath: string;
  fileSize: number;
  expiryDate?: Date;
}
```

#### `GET /company-documents`
List company documents.

**Query Parameters:**
- `documentType?: string` - Filter by document type

#### `PUT /company-documents/:id`
Update document metadata.

**Parameters:**
```typescript
{
  name?: string;
  description?: string;
  expiryDate?: Date;
}
```

#### `DELETE /company-documents/:id`
Delete a document.

#### `GET /company-documents/expiring`
Get documents expiring within 30 days.

---

## Storage API

### Document Upload

#### `POST /leave-documents/upload`
Upload a leave request document.

**Parameters:**
```typescript
{
  filename: string;
  fileData: string; // Base64 encoded
  leaveRequestId: number;
}
```

**Response:**
```typescript
{
  documentId: string;
  filePath: string;
}
```

#### `POST /company-documents/upload`
Upload a company document.

**Parameters:**
```typescript
{
  filename: string;
  fileData: string; // Base64 encoded
  documentType: string;
}
```

#### `POST /profile-images/upload`
Upload a profile image.

**Parameters:**
```typescript
{
  filename: string;
  fileData: string; // Base64 encoded
  employeeId: number;
}
```

**Response:**
```typescript
{
  imageUrl: string;
  filePath: string;
}
```

### Document Download

#### `GET /leave-documents/:documentId`
Get download URL for leave document.

#### `GET /company-documents/file/:filePath`
Get download URL for company document.

---

## Admin API

#### `POST /admin/create-initial`
Create initial admin user.

**Parameters:**
```typescript
{
  email: string;
  name: string;
  department: string;
  supabaseId: string;
  initSecret: string;
}
```

#### `POST /admin/create`
Create additional admin user.

**Parameters:**
```typescript
{
  email: string;
  name: string;
  department: string;
  supabaseId: string;
}
```

#### `PUT /admin/update-role`
Update user role.

**Parameters:**
```typescript
{
  employeeId: number;
  newRole: 'employee' | 'manager' | 'hr';
}
```

#### `GET /admin/stats`
Get admin dashboard statistics.

**Response:**
```typescript
{
  totalEmployees: number;
  totalManagers: number;
  totalHR: number;
  totalLeaveRequests: number;
  pendingRequests: number;
  totalLeaveTypes: number;
}
```

#### `GET /admin/health`
Get system health status.

**Response:**
```typescript
{
  status: 'healthy' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: string;
    message?: string;
  }>;
}
```

---

## Reporting API

#### `GET /reports/leave-usage`
Get leave usage report.

**Query Parameters:**
- `year?: number` - Filter by year
- `department?: string` - Filter by department

**Response:**
```typescript
{
  totalAllocatedDays: number;
  totalUsedDays: number;
  utilizationPercentage: number;
  averageUtilization: number;
  employeeReport: Array<{
    employeeId: number;
    employeeName: string;
    department: string;
    leaveTypeName: string;
    allocatedDays: number;
    usedDays: number;
    utilizationPercentage: number;
  }>;
  departmentSummary: Array<{
    department: string;
    totalAllocated: number;
    totalUsed: number;
    utilizationPercentage: number;
  }>;
}
```

#### `GET /reports/pending-requests`
Get pending requests summary for managers.

**Response:**
```typescript
{
  totalPending: number;
  byDepartment: Array<{
    department: string;
    pendingCount: number;
  }>;
  byLeaveType: Array<{
    leaveTypeName: string;
    pendingCount: number;
  }>;
}
```

---

## Error Handling

### Standard Error Response Format

```typescript
{
  code: string;
  message: string;
  details?: any;
  internal_message?: string;
}
```

### Common HTTP Status Codes

- **200 OK** - Successful request
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Authentication required or invalid
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource conflict (e.g., duplicate email)
- **422 Unprocessable Entity** - Validation errors
- **500 Internal Server Error** - Server error

### Error Codes

| Code | Description |
|------|-------------|
| `unauthenticated` | No authentication provided |
| `invalid_jwt` | JWT token is invalid or expired |
| `insufficient_permissions` | User lacks required role/permissions |
| `validation_failed` | Request validation failed |
| `resource_not_found` | Requested resource does not exist |
| `duplicate_resource` | Resource already exists |
| `business_rule_violation` | Business logic constraint violated |
| `external_service_error` | External service (Supabase) error |

### Example Error Responses

#### Authentication Error
```json
{
  "code": "unauthenticated",
  "message": "endpoint requires auth but none provided"
}
```

#### Validation Error
```json
{
  "code": "validation_failed",
  "message": "Invalid request parameters",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

#### Business Rule Violation
```json
{
  "code": "business_rule_violation",
  "message": "Insufficient leave balance",
  "details": {
    "requested": 10,
    "available": 5
  }
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute per user
- **File upload endpoints**: 10 requests per minute per user
- **Authentication endpoints**: 5 requests per minute per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Pagination

List endpoints support pagination using query parameters:

- `page?: number` - Page number (default: 1)
- `limit?: number` - Items per page (default: 50, max: 100)

Pagination information is included in response headers:

```
X-Total-Count: 250
X-Page-Count: 5
Link: </api/employees?page=2>; rel="next", </api/employees?page=5>; rel="last"
```

---

*Last Updated: December 2024*
*Version: 1.0*