import { api, APIError } from "encore.dev/api";
import { leaveDB } from "./db";
import type { AbsenceRecord, AbsenceConversionRequest } from "./types";

interface CreateAbsenceRecordRequest {
  employeeId: number;
  absenceDate: Date;
  reason?: string;
}

// Creates a new absence record (HR only).
export const createAbsenceRecord = api<CreateAbsenceRecordRequest, AbsenceRecord>(
  { expose: true, method: "POST", path: "/absence-records" },
  async (req) => {
    // In a real app, you'd verify the user is HR here
    const createdBy = 1; // Assuming HR user ID is 1 for demo

    const absenceRecord = await leaveDB.queryRow<AbsenceRecord>`
      INSERT INTO absence_records (employee_id, absence_date, reason, created_by)
      VALUES (${req.employeeId}, ${req.absenceDate}, ${req.reason || null}, ${createdBy})
      RETURNING 
        id,
        employee_id as "employeeId",
        absence_date as "absenceDate",
        reason,
        status,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (!absenceRecord) {
      throw new Error("Failed to create absence record");
    }

    return absenceRecord;
  }
);

interface ListAbsenceRecordsParams {
  employeeId?: number;
  status?: string;
}

interface ListAbsenceRecordsResponse {
  records: AbsenceRecord[];
}

// Retrieves absence records with optional filtering.
export const listAbsenceRecords = api<ListAbsenceRecordsParams, ListAbsenceRecordsResponse>(
  { expose: true, method: "GET", path: "/absence-records" },
  async (params) => {
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    
    if (params.employeeId) {
      whereClause += ` AND ar.employee_id = $${queryParams.length + 1}`;
      queryParams.push(params.employeeId);
    }
    
    if (params.status) {
      whereClause += ` AND ar.status = $${queryParams.length + 1}`;
      queryParams.push(params.status);
    }

    const query = `
      SELECT 
        ar.id,
        ar.employee_id as "employeeId",
        ar.absence_date as "absenceDate",
        ar.reason,
        ar.status,
        ar.created_by as "createdBy",
        ar.created_at as "createdAt",
        ar.updated_at as "updatedAt",
        e.name as "employeeName",
        creator.name as "createdByName"
      FROM absence_records ar
      JOIN employees e ON ar.employee_id = e.id
      JOIN employees creator ON ar.created_by = creator.id
      ${whereClause}
      ORDER BY ar.absence_date DESC
    `;

    const records = await leaveDB.rawQueryAll<AbsenceRecord>(query, ...queryParams);
    return { records };
  }
);

interface CreateAbsenceConversionRequest {
  absenceRecordId: number;
  justification: string;
}

// Creates a new absence conversion request.
export const createAbsenceConversionRequest = api<CreateAbsenceConversionRequest, AbsenceConversionRequest>(
  { expose: true, method: "POST", path: "/absence-conversion-requests" },
  async (req) => {
    // Get the absence record to verify it exists and get employee info
    const absenceRecord = await leaveDB.queryRow<{employeeId: number; status: string}>`
      SELECT employee_id as "employeeId", status
      FROM absence_records
      WHERE id = ${req.absenceRecordId}
    `;

    if (!absenceRecord) {
      throw APIError.notFound("Absence record not found");
    }

    if (absenceRecord.status !== 'pending') {
      throw APIError.invalidArgument("Absence record has already been processed");
    }

    // Check if a conversion request already exists for this absence
    const existingRequest = await leaveDB.queryRow<{id: number}>`
      SELECT id
      FROM absence_conversion_requests
      WHERE absence_record_id = ${req.absenceRecordId}
    `;

    if (existingRequest) {
      throw APIError.alreadyExists("Conversion request already exists for this absence");
    }

    const conversionRequest = await leaveDB.queryRow<AbsenceConversionRequest>`
      INSERT INTO absence_conversion_requests (absence_record_id, employee_id, justification)
      VALUES (${req.absenceRecordId}, ${absenceRecord.employeeId}, ${req.justification})
      RETURNING 
        id,
        absence_record_id as "absenceRecordId",
        employee_id as "employeeId",
        justification,
        status,
        manager_comments as "managerComments",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (!conversionRequest) {
      throw new Error("Failed to create absence conversion request");
    }

    return conversionRequest;
  }
);

interface ListAbsenceConversionRequestsParams {
  employeeId?: number;
  managerId?: number;
  status?: string;
}

interface ListAbsenceConversionRequestsResponse {
  requests: AbsenceConversionRequest[];
}

// Retrieves absence conversion requests with optional filtering.
export const listAbsenceConversionRequests = api<ListAbsenceConversionRequestsParams, ListAbsenceConversionRequestsResponse>(
  { expose: true, method: "GET", path: "/absence-conversion-requests" },
  async (params) => {
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    
    if (params.employeeId) {
      whereClause += ` AND acr.employee_id = $${queryParams.length + 1}`;
      queryParams.push(params.employeeId);
    }
    
    if (params.managerId) {
      whereClause += ` AND e.manager_id = $${queryParams.length + 1}`;
      queryParams.push(params.managerId);
    }
    
    if (params.status) {
      whereClause += ` AND acr.status = $${queryParams.length + 1}`;
      queryParams.push(params.status);
    }

    const query = `
      SELECT 
        acr.id,
        acr.absence_record_id as "absenceRecordId",
        acr.employee_id as "employeeId",
        acr.justification,
        acr.status,
        acr.manager_comments as "managerComments",
        acr.approved_by as "approvedBy",
        acr.approved_at as "approvedAt",
        acr.created_at as "createdAt",
        acr.updated_at as "updatedAt",
        e.name as "employeeName",
        approver.name as "approverName",
        ar.absence_date as "absenceDate"
      FROM absence_conversion_requests acr
      JOIN employees e ON acr.employee_id = e.id
      JOIN absence_records ar ON acr.absence_record_id = ar.id
      LEFT JOIN employees approver ON acr.approved_by = approver.id
      ${whereClause}
      ORDER BY acr.created_at DESC
    `;

    const requests = await leaveDB.rawQueryAll<AbsenceConversionRequest>(query, ...queryParams);
    return { requests };
  }
);

interface UpdateAbsenceConversionStatusRequest {
  id: number;
  status: 'approved' | 'rejected';
  managerComments?: string;
  approvedBy: number;
}

// Updates the status of an absence conversion request (approve/reject).
export const updateAbsenceConversionStatus = api<UpdateAbsenceConversionStatusRequest, AbsenceConversionRequest>(
  { expose: true, method: "PUT", path: "/absence-conversion-requests/:id/status" },
  async (req) => {
    const now = new Date();
    
    // Get the conversion request details first
    const existingRequest = await leaveDB.queryRow<{
      employeeId: number;
      absenceRecordId: number;
      status: string;
    }>`
      SELECT 
        employee_id as "employeeId",
        absence_record_id as "absenceRecordId",
        status
      FROM absence_conversion_requests 
      WHERE id = ${req.id}
    `;

    if (!existingRequest) {
      throw APIError.notFound("Absence conversion request not found");
    }

    if (existingRequest.status !== 'pending') {
      throw APIError.invalidArgument("Absence conversion request has already been processed");
    }

    // Update the request status
    const updatedRequest = await leaveDB.queryRow<AbsenceConversionRequest>`
      UPDATE absence_conversion_requests 
      SET 
        status = ${req.status},
        manager_comments = ${req.managerComments || null},
        approved_by = ${req.approvedBy},
        approved_at = ${now},
        updated_at = ${now}
      WHERE id = ${req.id}
      RETURNING 
        id,
        absence_record_id as "absenceRecordId",
        employee_id as "employeeId",
        justification,
        status,
        manager_comments as "managerComments",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (!updatedRequest) {
      throw new Error("Failed to update absence conversion request");
    }

    // If approved, deduct from annual leave balance and mark absence as approved
    if (req.status === 'approved') {
      const currentYear = new Date().getFullYear();
      
      // Get the annual leave type ID
      const annualLeaveType = await leaveDB.queryRow<{id: number}>`
        SELECT id FROM leave_types WHERE name = 'Annual Leave'
      `;

      if (annualLeaveType) {
        // Deduct 1 day from annual leave balance
        await leaveDB.exec`
          UPDATE employee_leave_balances 
          SET used_days = used_days + 1
          WHERE employee_id = ${existingRequest.employeeId} 
            AND leave_type_id = ${annualLeaveType.id}
            AND year = ${currentYear}
        `;
      }

      // Mark the absence record as approved
      await leaveDB.exec`
        UPDATE absence_records 
        SET status = 'approved', updated_at = ${now}
        WHERE id = ${existingRequest.absenceRecordId}
      `;
    } else {
      // If rejected, mark the absence record as rejected
      await leaveDB.exec`
        UPDATE absence_records 
        SET status = 'rejected', updated_at = ${now}
        WHERE id = ${existingRequest.absenceRecordId}
      `;
    }

    return updatedRequest;
  }
);
