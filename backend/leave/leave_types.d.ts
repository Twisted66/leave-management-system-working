import type { LeaveType } from "./types";
interface ListLeaveTypesResponse {
    leaveTypes: LeaveType[];
}
export declare const listLeaveTypes: () => Promise<ListLeaveTypesResponse>;
export {};
