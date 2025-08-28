import * as cron from 'node-cron';
import { leaveDB } from './db';
import { sendDocumentExpiryNotification } from './notifications';

interface DocumentNotifierRecord {
  id: number;
  documentId?: number;
  documentName: string;
  userId: number;
  userName: string;
  userEmail: string;
  expiryDate: Date;
  notificationFrequency: 'weekly' | 'monthly' | 'custom';
  customFrequencyDays?: number;
  status: 'active' | 'inactive';
  lastNotificationSent?: Date;
}

// Calculate if notification should be sent based on frequency and last sent date
function shouldSendNotification(record: DocumentNotifierRecord): boolean {
  const now = new Date();
  const expiryDate = new Date(record.expiryDate);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Don't send notifications for already expired documents
  if (daysUntilExpiry < 0) {
    return false;
  }
  
  // Calculate notification threshold based on frequency
  let thresholdDays: number;
  switch (record.notificationFrequency) {
    case 'weekly':
      thresholdDays = 7;
      break;
    case 'monthly':
      thresholdDays = 30;
      break;
    case 'custom':
      thresholdDays = record.customFrequencyDays || 30;
      break;
    default:
      thresholdDays = 30;
  }
  
  // Check if document is within notification threshold
  if (daysUntilExpiry > thresholdDays) {
    return false;
  }
  
  // Check if we've already sent a notification recently
  if (record.lastNotificationSent) {
    const lastSent = new Date(record.lastNotificationSent);
    const daysSinceLastNotification = Math.ceil((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
    
    // Don't spam notifications - wait at least 7 days between notifications
    if (daysSinceLastNotification < 7) {
      return false;
    }
    
    // For weekly frequency, send max once per week
    if (record.notificationFrequency === 'weekly' && daysSinceLastNotification < 7) {
      return false;
    }
    
    // For monthly frequency, send max twice per month (every 15 days)
    if (record.notificationFrequency === 'monthly' && daysSinceLastNotification < 15) {
      return false;
    }
  }
  
  return true;
}

// Process document expiry notifications
async function processDocumentExpiryNotifications(): Promise<void> {
  console.log('🔍 Starting document expiry notification scan...');
  
  try {
    // Get all active document notifiers with user information
    const activeNotifiers = await leaveDB.queryAll<DocumentNotifierRecord>`
      SELECT 
        dn.id,
        dn.document_id as "documentId",
        dn.document_name as "documentName",
        dn.user_id as "userId",
        dn.expiry_date as "expiryDate",
        dn.notification_frequency as "notificationFrequency",
        dn.custom_frequency_days as "customFrequencyDays",
        dn.status,
        dn.last_notification_sent as "lastNotificationSent",
        e.name as "userName",
        e.email as "userEmail"
      FROM document_notifiers dn
      JOIN employees e ON dn.user_id = e.id
      WHERE dn.status = 'active'
        AND dn.expiry_date >= CURRENT_DATE
      ORDER BY dn.expiry_date ASC
    `;
    
    console.log(`📋 Found ${activeNotifiers.length} active document notifiers`);
    
    let notificationsSent = 0;
    let notificationsSkipped = 0;
    
    for (const notifier of activeNotifiers) {
      try {
        if (shouldSendNotification(notifier)) {
          console.log(`📧 Sending notification for document: ${notifier.documentName} to ${notifier.userEmail}`);
          
          await sendDocumentExpiryNotification({
            notifierId: notifier.id,
            documentName: notifier.documentName,
            expiryDate: notifier.expiryDate,
            recipientEmail: notifier.userEmail,
            recipientName: notifier.userName,
            daysUntilExpiry: Math.ceil((new Date(notifier.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          });
          
          // Update last notification sent timestamp
          await leaveDB.exec`
            UPDATE document_notifiers 
            SET last_notification_sent = NOW()
            WHERE id = ${notifier.id}
          `;
          
          notificationsSent++;
        } else {
          console.log(`⏭️ Skipping notification for document: ${notifier.documentName} (not due yet or recently sent)`);
          notificationsSkipped++;
        }
      } catch (error) {
        console.error(`❌ Failed to process notification for document ${notifier.documentName}:`, error);
      }
    }
    
    console.log(`✅ Document expiry notification scan completed:`);
    console.log(`   📧 Notifications sent: ${notificationsSent}`);
    console.log(`   ⏭️ Notifications skipped: ${notificationsSkipped}`);
    console.log(`   📊 Total processed: ${activeNotifiers.length}`);
    
  } catch (error) {
    console.error('❌ Error during document expiry notification scan:', error);
  }
}

// Initialize cron jobs
export function initializeCronJobs(): void {
  console.log('🚀 Initializing cron jobs...');
  
  // Daily document expiry check at 8:00 AM (server time)
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running scheduled document expiry notification check...');
    await processDocumentExpiryNotifications();
  }, {
    scheduled: true,
    timezone: 'UTC' // You can change this to your server's timezone
  });
  
  console.log('✅ Cron jobs initialized successfully');
  console.log('   📅 Document expiry notifications: Daily at 08:00 AM UTC');
}

// Manual trigger for testing (can be called via API)
export async function triggerDocumentExpiryCheck(): Promise<{
  notificationsSent: number;
  notificationsProcessed: number;
}> {
  console.log('🔧 Manual trigger: Document expiry notification check');
  
  const before = await leaveDB.queryRow<{count: number}>`
    SELECT COUNT(*) as count FROM document_notifiers 
    WHERE last_notification_sent IS NOT NULL
  `;
  
  await processDocumentExpiryNotifications();
  
  const after = await leaveDB.queryRow<{count: number}>`
    SELECT COUNT(*) as count FROM document_notifiers 
    WHERE last_notification_sent IS NOT NULL
  `;
  
  const notificationsSent = (after?.count || 0) - (before?.count || 0);
  
  const totalProcessed = await leaveDB.queryRow<{count: number}>`
    SELECT COUNT(*) as count FROM document_notifiers 
    WHERE status = 'active' AND expiry_date >= CURRENT_DATE
  `;
  
  return {
    notificationsSent,
    notificationsProcessed: totalProcessed?.count || 0
  };
}