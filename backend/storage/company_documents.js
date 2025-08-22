import { api } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";
const companyDocumentsBucket = new Bucket("company-documents");
// Uploads a company document to object storage.
export const uploadCompanyDocument = api({ expose: true, method: "POST", path: "/company-documents/upload" }, async (req) => {
    // Decode base64 file data
    const fileBuffer = Buffer.from(req.fileData, 'base64');
    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `${req.documentType}/${timestamp}-${req.filename}`;
    // Upload to object storage
    await companyDocumentsBucket.upload(filePath, fileBuffer, {
        contentType: getContentType(req.filename)
    });
    // Generate signed download URL (valid for 1 hour)
    const { url } = await companyDocumentsBucket.signedDownloadUrl(filePath, { ttl: 3600 });
    return {
        filePath,
        downloadUrl: url
    };
});
// Generates a download URL for a company document.
export const getCompanyDocument = api({ expose: true, method: "GET", path: "/company-documents/file/:filePath" }, async ({ filePath }) => {
    // Generate signed download URL (valid for 1 hour)
    const { url } = await companyDocumentsBucket.signedDownloadUrl(filePath, { ttl: 3600 });
    return { downloadUrl: url };
});
function getContentType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'doc': return 'application/msword';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'xls': return 'application/vnd.ms-excel';
        case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
}
//# sourceMappingURL=company_documents.js.map