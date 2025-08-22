interface UploadProfileImageRequest {
    employeeId: number;
    filename: string;
    fileData: string;
}
interface UploadProfileImageResponse {
    imageUrl: string;
}
export declare const uploadProfileImage: (params: UploadProfileImageRequest) => Promise<UploadProfileImageResponse>;
export {};
