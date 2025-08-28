import { api } from "encore.dev/api";
import { triggerDocumentExpiryCheck } from "./cron_jobs";

// Test endpoint without authentication for testing cron functionality
export const testDocumentExpiryCheck = api<void, {notificationsSent: number; notificationsProcessed: number}>(
  { expose: true, method: "POST", path: "/test/document-expiry-check" },
  async () => {
    console.log('🧪 TEST: Manual trigger for document expiry check (no auth required)');
    return await triggerDocumentExpiryCheck();
  }
);

// Test endpoint to create sample test data
export const createTestDocumentNotifier = api<void, {message: string}>(
  { expose: true, method: "POST", path: "/test/create-sample-notifier" },
  async () => {
    console.log('🧪 TEST: Creating sample document notifier for testing');
    
    try {
      const { leaveDB } = await import('./db');
      
      // Get any existing employee from the database
      const testEmployee = await leaveDB.queryRow<{id: number, email: string}>`
        SELECT id, email FROM employees LIMIT 1
      `;
      
      if (!testEmployee) {
        return { message: 'No employees found in database. Please create users first through the authentication flow.' };
      }
      
      console.log(`📝 Using employee ${testEmployee.email} (ID: ${testEmployee.id}) for test data`);
      
      // Create a document notifier that expires in 10 days (should trigger weekly notifications)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      await leaveDB.exec`
        INSERT INTO document_notifiers (
          document_name, user_id, expiry_date, 
          notification_frequency, status
        )
        VALUES (
          'Test Document - Company License', 
          ${testEmployee.id}, 
          ${futureDate},
          'weekly', 
          'active'
        )
        ON CONFLICT DO NOTHING
      `;
      
      // Also create one that expires in 25 days for monthly testing
      const monthlyDate = new Date();
      monthlyDate.setDate(monthlyDate.getDate() + 25);
      
      await leaveDB.exec`
        INSERT INTO document_notifiers (
          document_name, user_id, expiry_date, 
          notification_frequency, status
        )
        VALUES (
          'Test Document - Business License', 
          ${testEmployee.id}, 
          ${monthlyDate},
          'monthly', 
          'active'
        )
        ON CONFLICT DO NOTHING
      `;
      
      console.log('✅ Test document notifiers created successfully!');
      return { 
        message: `Sample document notifiers created for ${testEmployee.email}! One expires in 10 days (weekly), another in 25 days (monthly).` 
      };
    } catch (error) {
      console.error('❌ Failed to create sample data:', error);
      return { message: `Error: ${error.message}` };
    }
  }
);