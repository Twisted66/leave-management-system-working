import { api, APIError } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { leaveDB } from "./db";

interface UserPreferences {
  id: number;
  employeeId: number;
  emailNotifications: boolean;
  requestUpdates: boolean;
  reminderNotifications: boolean;
  weeklyReports: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateUserPreferencesRequest {
  emailNotifications?: boolean;
  requestUpdates?: boolean;
  reminderNotifications?: boolean;
  weeklyReports?: boolean;
}

interface GetUserPreferencesParams {
  employeeId?: number;
}

/**
 * Gets user preferences for the current user or specified employee (HR/Manager only)
 */
export const getUserPreferences = api<GetUserPreferencesParams, UserPreferences>(
  { expose: true, method: "GET", path: "/user-preferences", auth: true },
  async (params) => {
    const auth = getAuthData()!;
    
    // Determine which employee's preferences to fetch
    let targetEmployeeId = params.employeeId || parseInt(auth.userID);
    
    // Permission checks
    if (params.employeeId && params.employeeId !== parseInt(auth.userID)) {
      if (auth.role === 'employee') {
        throw APIError.permissionDenied("You can only view your own preferences");
      }
      
      if (auth.role === 'manager') {
        // Managers can only view their team members' preferences
        const isTeamMember = await leaveDB.queryRow<{count: number}>`
          SELECT COUNT(*) as count FROM employees 
          WHERE id = ${params.employeeId} AND (manager_id = ${parseInt(auth.userID)} OR id = ${parseInt(auth.userID)})
        `;
        if (!isTeamMember || isTeamMember.count === 0) {
          throw APIError.permissionDenied("You can only view preferences for yourself or your team members");
        }
      }
    }

    // Get or create preferences
    let preferences = await leaveDB.queryRow<UserPreferences>`
      SELECT 
        id,
        employee_id as "employeeId",
        email_notifications as "emailNotifications",
        request_updates as "requestUpdates", 
        reminder_notifications as "reminderNotifications",
        weekly_reports as "weeklyReports",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM user_preferences 
      WHERE employee_id = ${targetEmployeeId}
    `;

    if (!preferences) {
      // Create default preferences if they don't exist
      preferences = await leaveDB.queryRow<UserPreferences>`
        INSERT INTO user_preferences (employee_id)
        VALUES (${targetEmployeeId})
        RETURNING 
          id,
          employee_id as "employeeId",
          email_notifications as "emailNotifications",
          request_updates as "requestUpdates", 
          reminder_notifications as "reminderNotifications",
          weekly_reports as "weeklyReports",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
    }

    if (!preferences) {
      throw APIError.internal("Failed to create or retrieve user preferences");
    }

    return preferences;
  }
);

/**
 * Updates user preferences for the current user or specified employee (HR/Manager only)
 */
export const updateUserPreferences = api<UpdateUserPreferencesRequest & GetUserPreferencesParams, UserPreferences>(
  { expose: true, method: "PUT", path: "/user-preferences", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Determine which employee's preferences to update
    let targetEmployeeId = req.employeeId || parseInt(auth.userID);
    
    // Permission checks
    if (req.employeeId && req.employeeId !== parseInt(auth.userID)) {
      if (auth.role === 'employee') {
        throw APIError.permissionDenied("You can only update your own preferences");
      }
      
      if (auth.role === 'manager') {
        // Managers can only update their team members' preferences
        const isTeamMember = await leaveDB.queryRow<{count: number}>`
          SELECT COUNT(*) as count FROM employees 
          WHERE id = ${req.employeeId} AND (manager_id = ${parseInt(auth.userID)} OR id = ${parseInt(auth.userID)})
        `;
        if (!isTeamMember || isTeamMember.count === 0) {
          throw APIError.permissionDenied("You can only update preferences for yourself or your team members");
        }
      }
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.emailNotifications !== undefined) {
      updates.push(`email_notifications = $${paramIndex++}`);
      values.push(req.emailNotifications);
    }
    
    if (req.requestUpdates !== undefined) {
      updates.push(`request_updates = $${paramIndex++}`);
      values.push(req.requestUpdates);
    }
    
    if (req.reminderNotifications !== undefined) {
      updates.push(`reminder_notifications = $${paramIndex++}`);
      values.push(req.reminderNotifications);
    }
    
    if (req.weeklyReports !== undefined) {
      updates.push(`weekly_reports = $${paramIndex++}`);
      values.push(req.weeklyReports);
    }

    if (updates.length === 0) {
      throw APIError.invalidArgument("No preferences provided to update");
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);
    
    // Add employee ID for WHERE clause
    values.push(targetEmployeeId);

    const updateQuery = `
      UPDATE user_preferences 
      SET ${updates.join(', ')}
      WHERE employee_id = $${paramIndex}
      RETURNING 
        id,
        employee_id as "employeeId",
        email_notifications as "emailNotifications",
        request_updates as "requestUpdates", 
        reminder_notifications as "reminderNotifications",
        weekly_reports as "weeklyReports",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    let preferences = await leaveDB.rawQueryRow<UserPreferences>(updateQuery, ...values);

    // If no rows were updated, create the preferences record
    if (!preferences) {
      preferences = await leaveDB.queryRow<UserPreferences>`
        INSERT INTO user_preferences (
          employee_id,
          email_notifications,
          request_updates,
          reminder_notifications,
          weekly_reports
        )
        VALUES (
          ${targetEmployeeId},
          ${req.emailNotifications ?? true},
          ${req.requestUpdates ?? true},
          ${req.reminderNotifications ?? true},
          ${req.weeklyReports ?? false}
        )
        RETURNING 
          id,
          employee_id as "employeeId",
          email_notifications as "emailNotifications",
          request_updates as "requestUpdates", 
          reminder_notifications as "reminderNotifications",
          weekly_reports as "weeklyReports",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
    }

    if (!preferences) {
      throw APIError.internal("Failed to update user preferences");
    }

    return preferences;
  }
);