interface UploadCompanyDocumentRequest {
    filename: string;
    fileData: string;
    documentType: string;
}
interface UploadCompanyDocumentResponse {
    filePath: string;
    downloadUrl: string;
}
export declare const uploadCompanyDocument: (params: UploadCompanyDocumentRequest) => Promise<UploadCompanyDocumentResponse>;
interface GetCompanyDocumentParams {
    filePath: string;
}
interface GetCompanyDocumentResponse {
    downloadUrl: string;
}
export declare const getCompanyDocument: (params: GetCompanyDocumentParams) => Promise<GetCompanyDocumentResponse>;
export {};
