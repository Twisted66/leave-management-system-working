import { api } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { leaveDB } from "./db";
import { secret } from "encore.dev/config";
import * as nodemailer from 'nodemailer';

const emailApiKey = secret("EmailAPIKey");
const smtpHost = secret("SMTP_HOST");
const smtpPort = secret("SMTP_PORT");
const smtpUser = secret("SMTP_USER");
const smtpPass = secret("SMTP_PASS");

interface SendExpiryNotificationRequest {
  documentId: number;
  recipientEmail: string;
}

interface SendDocumentExpiryNotificationRequest {
  notifierId: number;
  documentName: string;
  expiryDate: Date;
  recipientEmail: string;
  recipientName: string;
  daysUntilExpiry: number;
}

// Create reusable transporter
async function createMailTransporter() {
  try {
    const transporter = nodemailer.createTransporter({
      host: await smtpHost(),
      port: parseInt(await smtpPort()),
      secure: false, // true for 465, false for other ports
      auth: {
        user: await smtpUser(),
        pass: await smtpPass(),
      },
      tls: {
        rejectUnauthorized: false // For development - remove in production
      }
    });
    return transporter;
  } catch (error) {
    console.warn('SMTP configuration not available, falling back to console logging:', error);
    return null;
  }
}

// Generate professional email template
function generateExpiryEmailTemplate(
  documentName: string,
  expiryDate: Date,
  recipientName: string,
  daysUntilExpiry: number
): string {
  const formattedDate = expiryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const urgencyLevel = daysUntilExpiry <= 7 ? 'URGENT' : daysUntilExpiry <= 14 ? 'IMPORTANT' : 'NOTICE';
  const urgencyColor = daysUntilExpiry <= 7 ? '#dc3545' : daysUntilExpiry <= 14 ? '#fd7e14' : '#ffc107';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Expiry Alert</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">📄 Document Expiry Alert</h1>
            <div style="background-color: ${urgencyColor}; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin-top: 10px; font-weight: bold;">
                ${urgencyLevel}
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; margin-bottom: 25px;">Hello <strong>${recipientName}</strong>,</p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; border-left: 5px solid ${urgencyColor}; margin: 25px 0;">
                <h2 style="color: #495057; margin-top: 0; font-size: 20px;">📋 Document Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Document Name:</td>
                        <td style="padding: 8px 0; color: #495057;">${documentName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Expiry Date:</td>
                        <td style="padding: 8px 0; color: #495057;">${formattedDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Days Remaining:</td>
                        <td style="padding: 8px 0;">
                            <span style="background-color: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 15px; font-weight: bold;">
                                ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}
                            </span>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 5px solid #2196f3; margin: 25px 0;">
                <h3 style="color: #1565c0; margin-top: 0;">🔔 Action Required</h3>
                <p style="margin-bottom: 0; color: #1976d2;">Please review this document and take necessary action before the expiry date to ensure compliance and avoid any disruptions.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                    View Document Dashboard
                </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <div style="text-align: center; color: #6c757d; font-size: 14px;">
                <p>This is an automated notification from your Leave Management System.</p>
                <p>Please do not reply to this email. For support, contact your HR department.</p>
                <p style="margin-bottom: 0;">© ${new Date().getFullYear()} Leave Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
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

    // Try to send email via SMTP, fallback to console logging
    const transporter = await createMailTransporter();
    
    if (transporter) {
      try {
        const daysUntilExpiry = Math.ceil((document.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        const mailOptions = {
          from: await smtpUser(),
          to: req.recipientEmail,
          subject: `⚠️ Document Expiry Alert: ${document.name} expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}`,
          html: generateExpiryEmailTemplate(
            document.name,
            document.expiryDate,
            'Team Member', // Default name if not provided
            daysUntilExpiry
          )
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email notification sent successfully to ${req.recipientEmail} for document: ${document.name}`);
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${req.recipientEmail}:`, emailError);
        // Fallback to console logging
        console.log(`📧 FALLBACK - Email notification for ${req.recipientEmail}:`);
        console.log(`Subject: Document Expiry Alert - ${document.name}`);
        console.log(`Document: ${document.name} (${document.documentType})`);
        console.log(`Expiry Date: ${document.expiryDate.toLocaleDateString()}`);
      }
    } else {
      // Fallback to console logging when SMTP not configured
      console.log(`📧 CONSOLE FALLBACK - Email notification for ${req.recipientEmail}:`);
      console.log(`Subject: Document Expiry Alert - ${document.name}`);
      console.log(`Document: ${document.name} (${document.documentType})`);
      console.log(`Expiry Date: ${document.expiryDate.toLocaleDateString()}`);
    }
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

// New enhanced notification function for cron jobs
export async function sendDocumentExpiryNotification(req: SendDocumentExpiryNotificationRequest): Promise<void> {
  const transporter = await createMailTransporter();
  
  if (transporter) {
    try {
      const mailOptions = {
        from: await smtpUser(),
        to: req.recipientEmail,
        subject: `⚠️ Document Expiry Alert: ${req.documentName} expires in ${req.daysUntilExpiry} ${req.daysUntilExpiry === 1 ? 'day' : 'days'}`,
        html: generateExpiryEmailTemplate(
          req.documentName,
          req.expiryDate,
          req.recipientName,
          req.daysUntilExpiry
        )
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email notification sent successfully to ${req.recipientEmail} for document: ${req.documentName}`);
    } catch (emailError) {
      console.error(`❌ Failed to send email to ${req.recipientEmail}:`, emailError);
      throw emailError; // Re-throw to handle in cron job
    }
  } else {
    // Fallback to console logging when SMTP not configured
    console.log(`📧 CONSOLE FALLBACK - Email notification for ${req.recipientEmail}:`);
    console.log(`Subject: Document Expiry Alert - ${req.documentName}`);
    console.log(`Document: ${req.documentName}`);
    console.log(`Expiry Date: ${new Date(req.expiryDate).toLocaleDateString()}`);
    console.log(`Recipient: ${req.recipientName}`);
    console.log(`Days until expiry: ${req.daysUntilExpiry}`);
  }
}

// Manual trigger API for document expiry check
export const triggerDocumentExpiryCheck = api<void, {notificationsSent: number; notificationsProcessed: number}>(
  { expose: true, method: "POST", path: "/notifications/trigger-expiry-check", auth: true },
  async () => {
    const auth = getAuthData()!;
    
    // Only HR can trigger manual expiry checks
    if (auth.role !== 'hr') {
      throw new Error("Access denied. HR role required.");
    }

    // Import and use the manual trigger function
    const { triggerDocumentExpiryCheck } = await import('./cron_jobs');
    return await triggerDocumentExpiryCheck();
  }
);
