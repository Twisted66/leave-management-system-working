export interface Employee {
  id: number;
  email: string;
  name: string;
  department: string;
  role: 'employee' | 'manager' | 'hr';
  managerId?: number;
  createdAt: Date;
}

export interface LeaveType {
  id: number;
  name: string;
  annualAllocation: number;
  carryForwardLimit: number;
  createdAt: Date;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  year: number;
  allocatedDays: number;
  usedDays: number;
  carriedForwardDays: number;
  availableDays: number;
  leaveTypeName?: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  daysRequested: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  managerComments?: string;
  approvedBy?: number;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  employeeName?: string;
  leaveTypeName?: string;
  approverName?: string;
}

export interface LeaveDocument {
  id: number;
  leaveRequestId: number;
  filename: string;
  filePath: string;
  fileSize: number;
  uploadedAt: Date;
}
