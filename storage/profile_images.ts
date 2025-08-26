import { api } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";

const profileImagesBucket = new Bucket("profile-images", { public: true });

interface UploadProfileImageRequest {
  employeeId: number;
  filename: string;
  fileData: string; // base64 encoded file data
}

interface UploadProfileImageResponse {
  imageUrl: string;
}

// Uploads a profile image for an employee.
export const uploadProfileImage = api<UploadProfileImageRequest, UploadProfileImageResponse>(
  { expose: true, method: "POST", path: "/profile-images/upload" },
  async (req) => {
    // Decode base64 file data
    const fileBuffer = Buffer.from(req.fileData, 'base64');
    
    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = getFileExtension(req.filename);
    const filePath = `employees/${req.employeeId}/profile-${timestamp}.${fileExtension}`;
    
    // Upload to object storage
    await profileImagesBucket.upload(filePath, fileBuffer, {
      contentType: getContentType(req.filename)
    });
    
    // Get public URL
    const imageUrl = profileImagesBucket.publicUrl(filePath);
    
    return { imageUrl };
  }
);

function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() || 'jpg';
}

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}
