import type { CompanyDocument } from "./types";
interface CreateDocumentRequest {
    name: string;
    description?: string;
    documentType: 'license' | 'certificate' | 'policy' | 'other';
    filePath: string;
    fileSize: number;
    expiryDate?: Date;
}
export declare const createDocument: (params: CreateDocumentRequest) => Promise<CompanyDocument>;
interface ListDocumentsParams {
    documentType?: string;
}
interface ListDocumentsResponse {
    documents: CompanyDocument[];
}
export declare const listDocuments: (params: ListDocumentsParams) => Promise<ListDocumentsResponse>;
interface UpdateDocumentRequest {
    id: number;
    name?: string;
    description?: string;
    expiryDate?: Date;
}
export declare const updateDocument: (params: UpdateDocumentRequest) => Promise<CompanyDocument>;
interface DeleteDocumentParams {
    id: number;
}
export declare const deleteDocument: (params: DeleteDocumentParams) => Promise<void>;
interface ExpiringDocumentsResponse {
    documents: CompanyDocument[];
}
export declare const getExpiringDocuments: () => Promise<ExpiringDocumentsResponse>;
export {};
