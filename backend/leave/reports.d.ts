interface LeaveUsageReport {
    employeeId: number;
    employeeName: string;
    department: string;
    leaveTypeName: string;
    allocatedDays: number;
    usedDays: number;
    availableDays: number;
    utilizationPercentage: number;
}
interface DepartmentSummary {
    department: string;
    totalEmployees: number;
    totalAllocatedDays: number;
    totalUsedDays: number;
    averageUtilization: number;
}
interface LeaveUsageReportResponse {
    employeeReports: LeaveUsageReport[];
    departmentSummaries: DepartmentSummary[];
}
interface GetLeaveUsageReportParams {
    year?: number;
    department?: string;
}
export declare const getLeaveUsageReport: (params: GetLeaveUsageReportParams) => Promise<LeaveUsageReportResponse>;
interface PendingRequestsSummary {
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
export declare const getPendingRequestsSummary: () => Promise<PendingRequestsSummary>;
export {};
