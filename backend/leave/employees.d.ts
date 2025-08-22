import type { Employee } from "./types";
interface ListEmployeesResponse {
    employees: Employee[];
}
export declare const listEmployees: () => Promise<ListEmployeesResponse>;
interface GetEmployeeParams {
    id: number;
}
export declare const getEmployee: (params: GetEmployeeParams) => Promise<Employee>;
interface CreateEmployeeRequest {
    email: string;
    name: string;
    department: string;
    role: 'employee' | 'manager' | 'hr';
    managerId?: number;
    password: string;
}
export declare const createEmployee: (params: CreateEmployeeRequest) => Promise<Employee>;
interface UpdateEmployeeProfileRequest {
    id: number;
    name?: string;
    department?: string;
    profileImageUrl?: string;
}
export declare const updateEmployeeProfile: (params: UpdateEmployeeProfileRequest) => Promise<Employee>;
export {};
