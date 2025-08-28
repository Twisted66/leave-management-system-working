import { api } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";
const documentsBucket = new Bucket("leave-documents");
// Uploads a supporting document for a leave request.
export const uploadDocument = api({ expose: true, method: "POST", path: "/leave-documents/upload" }, async (req) => {
    // Decode base64 file data
    const fileBuffer = Buffer.from(req.fileData, 'base64');
    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `leave-requests/${req.leaveRequestId}/${timestamp}-${req.filename}`;
    // Upload to object storage
    await documentsBucket.upload(filePath, fileBuffer, {
        contentType: getContentType(req.filename)
    });
    // Generate signed download URL (valid for 1 hour)
    const { url } = await documentsBucket.signedDownloadUrl(filePath, { ttl: 3600 });
    return {
        documentId: filePath,
        downloadUrl: url
    };
});
// Generates a download URL for a document.
export const getDocument = api({ expose: true, method: "GET", path: "/leave-documents/:documentId" }, async ({ documentId }) => {
    // Generate signed download URL (valid for 1 hour)
    const { url } = await documentsBucket.signedDownloadUrl(documentId, { ttl: 3600 });
    return { downloadUrl: url };
});
function getContentType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'doc': return 'application/msword';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
}
//# sourceMappingURL=documents.js.map