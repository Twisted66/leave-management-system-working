import type { LeaveBalance } from "./types";
interface GetEmployeeBalancesParams {
    employeeId: number;
}
interface GetEmployeeBalancesResponse {
    balances: LeaveBalance[];
}
export declare const getEmployeeBalances: (params: GetEmployeeBalancesParams) => Promise<GetEmployeeBalancesResponse>;
interface UpdateBalanceRequest {
    employeeId: number;
    leaveTypeId: number;
    allocatedDays: number;
    carriedForwardDays: number;
}
export declare const updateBalance: (params: UpdateBalanceRequest) => Promise<LeaveBalance>;
export {};
