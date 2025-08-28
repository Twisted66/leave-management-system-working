interface UploadDocumentRequest {
    leaveRequestId: number;
    filename: string;
    fileData: string;
}
interface UploadDocumentResponse {
    documentId: string;
    downloadUrl: string;
}
export declare const uploadDocument: (params: UploadDocumentRequest) => Promise<UploadDocumentResponse>;
interface GetDocumentParams {
    documentId: string;
}
interface GetDocumentResponse {
    downloadUrl: string;
}
export declare const getDocument: (params: GetDocumentParams) => Promise<GetDocumentResponse>;
export {};
