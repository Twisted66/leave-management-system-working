import { api, APIError } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { leaveDB } from "./db";
import type { DocumentNotifier } from "./types";

interface CreateDocumentNotifierRequest {
  documentId?: number;
  documentName: string;
  userId: number;
  expiryDate: Date;
  notificationFrequency: 'weekly' | 'monthly' | 'custom';
  customFrequencyDays?: number;
  status: 'active' | 'inactive';
}

interface UpdateDocumentNotifierRequest {
  id: number;
  documentName?: string;
  userId?: number;
  expiryDate?: Date;
  notificationFrequency?: 'weekly' | 'monthly' | 'custom';
  customFrequencyDays?: number;
  status?: 'active' | 'inactive';
}

interface ListDocumentNotifiersResponse {
  notifiers: DocumentNotifier[];
}

interface ImportDocumentNotifiersRequest {
  data: string; // CSV or XML data
  format: 'csv' | 'xml';
}

interface ImportPreviewResponse {
  validRecords: any[];
  invalidRecords: any[];
  totalRecords: number;
  validCount: number;
  invalidCount: number;
}

interface ExportDocumentNotifiersParams {
  format: 'csv' | 'xml';
  dateFrom?: string;
  dateTo?: string;
  userId?: number;
  status?: 'active' | 'inactive';
}

// Creates a new document notifier
export const createDocumentNotifier = api<CreateDocumentNotifierRequest, DocumentNotifier>(
  { expose: true, method: "POST", path: "/document-notifiers", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can create document notifiers
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    // Validate that user exists
    const userExists = await leaveDB.queryRow<{exists: boolean}>`
      SELECT EXISTS(SELECT 1 FROM employees WHERE id = ${req.userId}) as exists
    `;
    
    if (!userExists?.exists) {
      throw APIError.invalidArgument("User ID does not exist in the system");
    }

    // Validate custom frequency
    if (req.notificationFrequency === 'custom' && !req.customFrequencyDays) {
      throw APIError.invalidArgument("Custom frequency days required when frequency is 'custom'");
    }

    const notifier = await leaveDB.queryRow<DocumentNotifier>`
      INSERT INTO document_notifiers (
        document_id, document_name, user_id, expiry_date, 
        notification_frequency, custom_frequency_days, status
      )
      VALUES (
        ${req.documentId || null}, ${req.documentName}, ${req.userId}, ${req.expiryDate},
        ${req.notificationFrequency}, ${req.customFrequencyDays || null}, ${req.status}
      )
      RETURNING 
        id,
        document_id as "documentId",
        document_name as "documentName",
        user_id as "userId",
        expiry_date as "expiryDate",
        notification_frequency as "notificationFrequency",
        custom_frequency_days as "customFrequencyDays",
        status,
        last_notification_sent as "lastNotificationSent",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (!notifier) {
      throw APIError.internal("Failed to create document notifier");
    }

    return notifier;
  }
);

// Lists all document notifiers
export const listDocumentNotifiers = api<void, ListDocumentNotifiersResponse>(
  { expose: true, method: "GET", path: "/document-notifiers", auth: true },
  async () => {
    const auth = getAuthData()!;
    
    // Only HR can view all document notifiers
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    const notifiers = await leaveDB.queryAll<DocumentNotifier>`
      SELECT 
        dn.id,
        dn.document_id as "documentId",
        dn.document_name as "documentName",
        dn.user_id as "userId",
        dn.expiry_date as "expiryDate",
        dn.notification_frequency as "notificationFrequency",
        dn.custom_frequency_days as "customFrequencyDays",
        dn.status,
        dn.last_notification_sent as "lastNotificationSent",
        dn.created_at as "createdAt",
        dn.updated_at as "updatedAt",
        e.name as "userName"
      FROM document_notifiers dn
      JOIN employees e ON dn.user_id = e.id
      ORDER BY dn.created_at DESC
    `;

    return { notifiers };
  }
);

// Updates a document notifier
export const updateDocumentNotifier = api<UpdateDocumentNotifierRequest, DocumentNotifier>(
  { expose: true, method: "PUT", path: "/document-notifiers/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can update document notifiers
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (req.documentName !== undefined) {
      updateFields.push(`document_name = $${paramIndex++}`);
      updateValues.push(req.documentName);
    }

    if (req.userId !== undefined) {
      // Validate that user exists
      const userExists = await leaveDB.queryRow<{exists: boolean}>`
        SELECT EXISTS(SELECT 1 FROM employees WHERE id = ${req.userId}) as exists
      `;
      
      if (!userExists?.exists) {
        throw APIError.invalidArgument("User ID does not exist in the system");
      }

      updateFields.push(`user_id = $${paramIndex++}`);
      updateValues.push(req.userId);
    }

    if (req.expiryDate !== undefined) {
      updateFields.push(`expiry_date = $${paramIndex++}`);
      updateValues.push(req.expiryDate);
    }

    if (req.notificationFrequency !== undefined) {
      updateFields.push(`notification_frequency = $${paramIndex++}`);
      updateValues.push(req.notificationFrequency);
    }

    if (req.customFrequencyDays !== undefined) {
      updateFields.push(`custom_frequency_days = $${paramIndex++}`);
      updateValues.push(req.customFrequencyDays);
    }

    if (req.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(req.status);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date());

    if (updateFields.length === 1) { // Only updated_at was added
      throw APIError.invalidArgument("No fields to update");
    }

    updateValues.push(req.id);

    const query = `
      UPDATE document_notifiers 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        document_id as "documentId",
        document_name as "documentName",
        user_id as "userId",
        expiry_date as "expiryDate",
        notification_frequency as "notificationFrequency",
        custom_frequency_days as "customFrequencyDays",
        status,
        last_notification_sent as "lastNotificationSent",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const notifier = await leaveDB.rawQueryRow<DocumentNotifier>(query, ...updateValues);

    if (!notifier) {
      throw APIError.notFound("Document notifier not found");
    }

    return notifier;
  }
);

// Deletes a document notifier
export const deleteDocumentNotifier = api<{id: number}, void>(
  { expose: true, method: "DELETE", path: "/document-notifiers/:id", auth: true },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Only HR can delete document notifiers
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    const result = await leaveDB.exec`DELETE FROM document_notifiers WHERE id = ${id}`;
    
    if (result.rowsAffected === 0) {
      throw APIError.notFound("Document notifier not found");
    }
  }
);

// Helper function to parse CSV data
function parseCSV(csvData: string): any[] {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have header and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

// Helper function to parse XML data (simple implementation)
function parseXML(xmlData: string): any[] {
  // This is a basic XML parser - in production, you'd use a proper XML parser library
  const records: any[] = [];
  const recordMatches = xmlData.match(/<record[^>]*>(.*?)<\/record>/gs);
  
  if (!recordMatches) {
    throw new Error('No valid XML records found');
  }

  recordMatches.forEach(recordMatch => {
    const record: any = {};
    const fieldMatches = recordMatch.match(/<(\w+)>(.*?)<\/\1>/g);
    
    if (fieldMatches) {
      fieldMatches.forEach(fieldMatch => {
        const match = fieldMatch.match(/<(\w+)>(.*?)<\/\1>/);
        if (match) {
          record[match[1]] = match[2];
        }
      });
      records.push(record);
    }
  });

  return records;
}

// Helper function to validate record data
function validateRecord(record: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!record.documentName || record.documentName.trim() === '') {
    errors.push('Document name is required');
  }
  
  if (!record.userId || isNaN(parseInt(record.userId))) {
    errors.push('Valid user ID is required');
  }
  
  if (!record.expiryDate) {
    errors.push('Expiry date is required');
  } else {
    const date = new Date(record.expiryDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid expiry date format');
    }
  }
  
  if (!record.notificationFrequency || !['weekly', 'monthly', 'custom'].includes(record.notificationFrequency)) {
    errors.push('Valid notification frequency is required (weekly, monthly, custom)');
  }
  
  if (record.notificationFrequency === 'custom' && (!record.customFrequencyDays || isNaN(parseInt(record.customFrequencyDays)))) {
    errors.push('Custom frequency days required when frequency is custom');
  }
  
  if (!record.status || !['active', 'inactive'].includes(record.status)) {
    errors.push('Valid status is required (active, inactive)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Preview import data before actual import
export const previewImportDocumentNotifiers = api<ImportDocumentNotifiersRequest, ImportPreviewResponse>(
  { expose: true, method: "POST", path: "/document-notifiers/import/preview", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can import document notifiers
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    try {
      let records: any[] = [];
      
      if (req.format === 'csv') {
        records = parseCSV(req.data);
      } else if (req.format === 'xml') {
        records = parseXML(req.data);
      } else {
        throw APIError.invalidArgument("Unsupported format. Use 'csv' or 'xml'");
      }

      const validRecords: any[] = [];
      const invalidRecords: any[] = [];

      for (const record of records) {
        const validation = validateRecord(record);
        if (validation.isValid) {
          validRecords.push(record);
        } else {
          invalidRecords.push({
            ...record,
            errors: validation.errors
          });
        }
      }

      return {
        validRecords,
        invalidRecords,
        totalRecords: records.length,
        validCount: validRecords.length,
        invalidCount: invalidRecords.length
      };
    } catch (error: any) {
      throw APIError.invalidArgument(`Failed to parse ${req.format.toUpperCase()} data: ${error.message}`);
    }
  }
);

// Import document notifiers from CSV/XML
export const importDocumentNotifiers = api<ImportDocumentNotifiersRequest, {imported: number; skipped: number}>(
  { expose: true, method: "POST", path: "/document-notifiers/import", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can import document notifiers
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    try {
      let records: any[] = [];
      
      if (req.format === 'csv') {
        records = parseCSV(req.data);
      } else if (req.format === 'xml') {
        records = parseXML(req.data);
      } else {
        throw APIError.invalidArgument("Unsupported format. Use 'csv' or 'xml'");
      }

      let imported = 0;
      let skipped = 0;

      for (const record of records) {
        const validation = validateRecord(record);
        if (!validation.isValid) {
          skipped++;
          continue;
        }

        try {
          // Check if user exists
          const userExists = await leaveDB.queryRow<{exists: boolean}>`
            SELECT EXISTS(SELECT 1 FROM employees WHERE id = ${parseInt(record.userId)}) as exists
          `;
          
          if (!userExists?.exists) {
            skipped++;
            continue;
          }

          await leaveDB.exec`
            INSERT INTO document_notifiers (
              document_id, document_name, user_id, expiry_date, 
              notification_frequency, custom_frequency_days, status
            )
            VALUES (
              ${record.documentId ? parseInt(record.documentId) : null},
              ${record.documentName},
              ${parseInt(record.userId)},
              ${new Date(record.expiryDate)},
              ${record.notificationFrequency},
              ${record.customFrequencyDays ? parseInt(record.customFrequencyDays) : null},
              ${record.status}
            )
          `;
          
          imported++;
        } catch (error) {
          console.error('Error importing record:', error);
          skipped++;
        }
      }

      return { imported, skipped };
    } catch (error: any) {
      throw APIError.invalidArgument(`Failed to import ${req.format.toUpperCase()} data: ${error.message}`);
    }
  }
);

// Export document notifiers to CSV/XML
export const exportDocumentNotifiers = api<ExportDocumentNotifiersParams, {data: string; filename: string}>(
  { expose: true, method: "GET", path: "/document-notifiers/export", auth: true },
  async (params) => {
    const auth = getAuthData()!;
    
    // Only HR can export document notifiers
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    // Build WHERE clause based on filters
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.dateFrom) {
      whereClause += ` AND dn.expiry_date >= $${paramIndex++}`;
      queryParams.push(new Date(params.dateFrom));
    }

    if (params.dateTo) {
      whereClause += ` AND dn.expiry_date <= $${paramIndex++}`;
      queryParams.push(new Date(params.dateTo));
    }

    if (params.userId) {
      whereClause += ` AND dn.user_id = $${paramIndex++}`;
      queryParams.push(params.userId);
    }

    if (params.status) {
      whereClause += ` AND dn.status = $${paramIndex++}`;
      queryParams.push(params.status);
    }

    const query = `
      SELECT 
        dn.id,
        dn.document_id as "documentId",
        dn.document_name as "documentName",
        dn.user_id as "userId",
        dn.expiry_date as "expiryDate",
        dn.notification_frequency as "notificationFrequency",
        dn.custom_frequency_days as "customFrequencyDays",
        dn.status,
        e.name as "userName",
        e.email as "userEmail"
      FROM document_notifiers dn
      JOIN employees e ON dn.user_id = e.id
      ${whereClause}
      ORDER BY dn.created_at DESC
    `;

    const notifiers = await leaveDB.rawQueryAll<any>(query, ...queryParams);

    const timestamp = new Date().toISOString().split('T')[0];
    let data: string;
    let filename: string;

    if (params.format === 'csv') {
      // Generate CSV
      const headers = ['id', 'documentId', 'documentName', 'userId', 'userName', 'userEmail', 'expiryDate', 'notificationFrequency', 'customFrequencyDays', 'status'];
      const csvRows = [headers.join(',')];
      
      notifiers.forEach(notifier => {
        const row = headers.map(header => {
          const value = notifier[header];
          if (value === null || value === undefined) return '';
          if (header === 'expiryDate' && value instanceof Date) {
            return value.toISOString().split('T')[0];
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(','));
      });
      
      data = csvRows.join('\n');
      filename = `document-notifiers-${timestamp}.csv`;
    } else {
      // Generate XML
      const xmlRows = notifiers.map(notifier => {
        return `  <record>
    <id>${notifier.id}</id>
    <documentId>${notifier.documentId || ''}</documentId>
    <documentName>${notifier.documentName}</documentName>
    <userId>${notifier.userId}</userId>
    <userName>${notifier.userName}</userName>
    <userEmail>${notifier.userEmail}</userEmail>
    <expiryDate>${notifier.expiryDate instanceof Date ? notifier.expiryDate.toISOString().split('T')[0] : notifier.expiryDate}</expiryDate>
    <notificationFrequency>${notifier.notificationFrequency}</notificationFrequency>
    <customFrequencyDays>${notifier.customFrequencyDays || ''}</customFrequencyDays>
    <status>${notifier.status}</status>
  </record>`;
      }).join('\n');
      
      data = `<?xml version="1.0" encoding="UTF-8"?>
<documentNotifiers>
${xmlRows}
</documentNotifiers>`;
      filename = `document-notifiers-${timestamp}.xml`;
    }

    return { data, filename };
  }
);