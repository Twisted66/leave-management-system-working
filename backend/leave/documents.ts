import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
import type { CompanyDocument } from "./types";

interface CreateDocumentRequest {
  name: string;
  description?: string;
  documentType: 'license' | 'certificate' | 'policy' | 'other';
  filePath: string;
  fileSize: number;
  expiryDate?: Date;
}

// Creates a new company document record.
export const createDocument = api<CreateDocumentRequest, CompanyDocument>(
  { expose: true, method: "POST", path: "/documents", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can create company documents
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    const uploadedBy = parseInt(auth.userID);

    const document = await leaveDB.queryRow<CompanyDocument>`
      INSERT INTO company_documents (name, description, document_type, file_path, file_size, expiry_date, uploaded_by)
      VALUES (${req.name}, ${req.description || null}, ${req.documentType}, ${req.filePath}, ${req.fileSize}, ${req.expiryDate || null}, ${uploadedBy})
      RETURNING 
        id,
        name,
        description,
        document_type as "documentType",
        file_path as "filePath",
        file_size as "fileSize",
        expiry_date as "expiryDate",
        uploaded_by as "uploadedBy",
        uploaded_at as "uploadedAt",
        updated_at as "updatedAt"
    `;

    if (!document) {
      throw new Error("Failed to create document");
    }

    return document;
  }
);

interface ListDocumentsParams {
  documentType?: string;
}

interface ListDocumentsResponse {
  documents: CompanyDocument[];
}

// Retrieves all company documents.
export const listDocuments = api<ListDocumentsParams, ListDocumentsResponse>(
  { expose: true, method: "GET", path: "/documents", auth: true },
  async (params) => {
    const auth = getAuthData()!;
    
    // Only HR can view company documents
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    
    if (params.documentType) {
      whereClause += ` AND cd.document_type = $${queryParams.length + 1}`;
      queryParams.push(params.documentType);
    }

    const query = `
      SELECT 
        cd.id,
        cd.name,
        cd.description,
        cd.document_type as "documentType",
        cd.file_path as "filePath",
        cd.file_size as "fileSize",
        cd.expiry_date as "expiryDate",
        cd.uploaded_by as "uploadedBy",
        cd.uploaded_at as "uploadedAt",
        cd.updated_at as "updatedAt",
        e.name as "uploaderName"
      FROM company_documents cd
      JOIN employees e ON cd.uploaded_by = e.id
      ${whereClause}
      ORDER BY cd.uploaded_at DESC
    `;

    const documents = await leaveDB.rawQueryAll<CompanyDocument>(query, ...queryParams);
    return { documents };
  }
);

interface UpdateDocumentRequest {
  id: number;
  name?: string;
  description?: string;
  expiryDate?: Date;
}

// Updates a company document.
export const updateDocument = api<UpdateDocumentRequest, CompanyDocument>(
  { expose: true, method: "PUT", path: "/documents/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can update company documents
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (req.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(req.name);
    }

    if (req.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(req.description);
    }

    if (req.expiryDate !== undefined) {
      updateFields.push(`expiry_date = $${paramIndex++}`);
      updateValues.push(req.expiryDate);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date());

    if (updateFields.length === 1) { // Only updated_at was added
      throw APIError.invalidArgument("No fields to update");
    }

    updateValues.push(req.id);

    const query = `
      UPDATE company_documents 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        name,
        description,
        document_type as "documentType",
        file_path as "filePath",
        file_size as "fileSize",
        expiry_date as "expiryDate",
        uploaded_by as "uploadedBy",
        uploaded_at as "uploadedAt",
        updated_at as "updatedAt"
    `;

    const document = await leaveDB.rawQueryRow<CompanyDocument>(query, ...updateValues);

    if (!document) {
      throw APIError.notFound("Document not found");
    }

    return document;
  }
);

interface DeleteDocumentParams {
  id: number;
}

// Deletes a company document.
export const deleteDocument = api<DeleteDocumentParams, void>(
  { expose: true, method: "DELETE", path: "/documents/:id", auth: true },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Only HR can delete company documents
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    await leaveDB.exec`DELETE FROM company_documents WHERE id = ${id}`;
  }
);

interface ExpiringDocumentsResponse {
  documents: CompanyDocument[];
}

// Retrieves documents that are expiring within the next 30 days.
export const getExpiringDocuments = api<void, ExpiringDocumentsResponse>(
  { expose: true, method: "GET", path: "/documents/expiring", auth: true },
  async () => {
    const auth = getAuthData()!;
    
    // Only HR can view expiring documents
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const documents = await leaveDB.queryAll<CompanyDocument>`
      SELECT 
        cd.id,
        cd.name,
        cd.description,
        cd.document_type as "documentType",
        cd.file_path as "filePath",
        cd.file_size as "fileSize",
        cd.expiry_date as "expiryDate",
        cd.uploaded_by as "uploadedBy",
        cd.uploaded_at as "uploadedAt",
        cd.updated_at as "updatedAt",
        e.name as "uploaderName"
      FROM company_documents cd
      JOIN employees e ON cd.uploaded_by = e.id
      WHERE cd.expiry_date IS NOT NULL 
        AND cd.expiry_date <= ${thirtyDaysFromNow}
        AND cd.expiry_date >= CURRENT_DATE
      ORDER BY cd.expiry_date ASC
    `;

    return { documents };
  }
);
