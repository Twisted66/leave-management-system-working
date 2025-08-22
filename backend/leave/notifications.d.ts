interface SendExpiryNotificationRequest {
    documentId: number;
    recipientEmail: string;
}
export declare const sendExpiryNotification: (params: SendExpiryNotificationRequest) => Promise<void>;
interface CheckExpiringDocumentsResponse {
    notificationsSent: number;
}
export declare const checkExpiringDocuments: () => Promise<CheckExpiringDocumentsResponse>;
export {};
