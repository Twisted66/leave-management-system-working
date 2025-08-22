import type { LeaveRequest } from "./types";
interface CreateLeaveRequestRequest {
    employeeId: number;
    leaveTypeId: number;
    startDate: Date;
    endDate: Date;
    reason?: string;
}
export declare const createLeaveRequest: (params: CreateLeaveRequestRequest) => Promise<LeaveRequest>;
interface ListLeaveRequestsParams {
    employeeId?: number;
    managerId?: number;
    status?: string;
}
interface ListLeaveRequestsResponse {
    requests: LeaveRequest[];
}
export declare const listLeaveRequests: (params: ListLeaveRequestsParams) => Promise<ListLeaveRequestsResponse>;
interface UpdateLeaveRequestStatusRequest {
    id: number;
    status: 'approved' | 'rejected';
    managerComments?: string;
    approvedBy: number;
}
export declare const updateLeaveRequestStatus: (params: UpdateLeaveRequestStatusRequest) => Promise<LeaveRequest>;
export {};
