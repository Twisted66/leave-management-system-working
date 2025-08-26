import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
import { secret } from "encore.dev/config";

const emailApiKey = secret("EmailAPIKey");

interface SendExpiryNotificationRequest {
  documentId: number;
  recipientEmail: string;
}

// Sends an email notification for document expiry.
export const sendExpiryNotification = api<SendExpiryNotificationRequest, void>(
  { expose: true, method: "POST", path: "/notifications/document-expiry", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can send notifications
    if (auth.role !== 'hr') {
      throw new Error("Access denied. HR role required.");
    }

    // Get document details
    const document = await leaveDB.queryRow<{
      name: string;
      expiryDate: Date;
      documentType: string;
    }>`
      SELECT name, expiry_date as "expiryDate", document_type as "documentType"
      FROM company_documents
      WHERE id = ${req.documentId}
    `;

    if (!document) {
      throw new Error("Document not found");
    }

    // In a real implementation, you would integrate with an email service like SendGrid, AWS SES, etc.
    // For now, we'll just log the notification
    console.log(`Email notification sent to ${req.recipientEmail}:`);
    console.log(`Subject: Document Expiry Alert - ${document.name}`);
    console.log(`Document: ${document.name} (${document.documentType})`);
    console.log(`Expiry Date: ${document.expiryDate.toLocaleDateString()}`);
    
    // TODO: Implement actual email sending
    // Example with a hypothetical email service:
    // await emailService.send({
    //   to: req.recipientEmail,
    //   subject: `Document Expiry Alert - ${document.name}`,
    //   html: generateExpiryEmailTemplate(document),
    //   apiKey: emailApiKey()
    // });
  }
);

interface CheckExpiringDocumentsResponse {
  notificationsSent: number;
}

// Checks for expiring documents and sends notifications.
export const checkExpiringDocuments = api<void, CheckExpiringDocumentsResponse>(
  { expose: true, method: "POST", path: "/notifications/check-expiring", auth: true },
  async () => {
    const auth = getAuthData()!;
    
    // Only HR can trigger expiry checks
    if (auth.role !== 'hr') {
      throw new Error("Access denied. HR role required.");
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDocuments = await leaveDB.queryAll<{
      id: number;
      name: string;
      expiryDate: Date;
      documentType: string;
    }>`
      SELECT 
        id,
        name,
        expiry_date as "expiryDate",
        document_type as "documentType"
      FROM company_documents
      WHERE expiry_date IS NOT NULL 
        AND expiry_date <= ${thirtyDaysFromNow}
        AND expiry_date >= CURRENT_DATE
      ORDER BY expiry_date ASC
    `;

    // Get HR emails to notify
    const hrEmails = await leaveDB.queryAll<{ email: string }>`
      SELECT email FROM employees WHERE role = 'hr'
    `;

    let notificationsSent = 0;

    for (const document of expiringDocuments) {
      for (const hr of hrEmails) {
        try {
          await sendExpiryNotification({
            documentId: document.id,
            recipientEmail: hr.email,
          });
          notificationsSent++;
        } catch (error) {
          console.error(`Failed to send notification for document ${document.id} to ${hr.email}:`, error);
        }
      }
    }

    return { notificationsSent };
  }
);
