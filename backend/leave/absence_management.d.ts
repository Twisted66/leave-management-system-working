import type { AbsenceRecord, AbsenceConversionRequest } from "./types";
interface CreateAbsenceRecordRequest {
    employeeId: number;
    absenceDate: Date;
    reason?: string;
}
export declare const createAbsenceRecord: (params: CreateAbsenceRecordRequest) => Promise<AbsenceRecord>;
interface ListAbsenceRecordsParams {
    employeeId?: number;
    status?: string;
}
interface ListAbsenceRecordsResponse {
    records: AbsenceRecord[];
}
export declare const listAbsenceRecords: (params: ListAbsenceRecordsParams) => Promise<ListAbsenceRecordsResponse>;
interface CreateAbsenceConversionRequest {
    absenceRecordId: number;
    justification: string;
}
export declare const createAbsenceConversionRequest: (params: CreateAbsenceConversionRequest) => Promise<AbsenceConversionRequest>;
interface ListAbsenceConversionRequestsParams {
    employeeId?: number;
    managerId?: number;
    status?: string;
}
interface ListAbsenceConversionRequestsResponse {
    requests: AbsenceConversionRequest[];
}
export declare const listAbsenceConversionRequests: (params: ListAbsenceConversionRequestsParams) => Promise<ListAbsenceConversionRequestsResponse>;
interface UpdateAbsenceConversionStatusRequest {
    id: number;
    status: 'approved' | 'rejected';
    managerComments?: string;
    approvedBy: number;
}
export declare const updateAbsenceConversionStatus: (params: UpdateAbsenceConversionStatusRequest) => Promise<AbsenceConversionRequest>;
export {};
