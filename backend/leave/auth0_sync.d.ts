import type { Employee } from "./types";
/**
 * Auth0 User Synchronization Endpoints
 *
 * These endpoints help synchronize user data between Auth0 and the internal database.
 * They should be called during user onboarding or when user data changes in Auth0.
 */
interface SyncUserRequest {
    auth0Sub: string;
    email: string;
    name: string;
    department: string;
    role?: 'employee' | 'manager' | 'hr';
    managerId?: number;
}
interface SyncUserResponse {
    employee: Employee;
    created: boolean;
}
/**
 * Synchronizes a user from Auth0 to the internal database
 * This endpoint should be called from Auth0 Actions or Rules when a user logs in
 * or when user metadata is updated in Auth0.
 *
 * Auth0 Configuration:
 * 1. Create a Machine-to-Machine application in Auth0 for server-side calls
 * 2. Grant necessary scopes to read user data
 * 3. Use this endpoint in Auth0 Actions (recommended) or Rules
 *
 * Example Auth0 Action:
 * ```javascript
 * exports.onExecutePostLogin = async (event, api) => {
 *   const axios = require('axios');
 *
 *   try {
 *     await axios.post('https://your-encore-app.com/auth0/sync-user', {
 *       auth0Sub: event.user.user_id,
 *       email: event.user.email,
 *       name: event.user.name || event.user.email,
 *       department: event.user.app_metadata?.department || 'General',
 *       role: event.user.app_metadata?.role || 'employee',
 *       managerId: event.user.app_metadata?.manager_id
 *     }, {
 *       headers: {
 *         'Authorization': `Bearer ${YOUR_M2M_TOKEN}`,
 *         'Content-Type': 'application/json'
 *       }
 *     });
 *   } catch (error) {
 *     console.error('Failed to sync user:', error);
 *   }
 * };
 * ```
 */
export declare const syncUser: (params: SyncUserRequest) => Promise<SyncUserResponse>;
interface BulkSyncRequest {
    users: SyncUserRequest[];
}
interface BulkSyncResponse {
    synced: number;
    created: number;
    errors: Array<{
        user: SyncUserRequest;
        error: string;
    }>;
}
/**
 * Bulk synchronization endpoint for migrating existing Auth0 users
 * This is useful for initial setup or bulk updates from Auth0 Management API
 */
export declare const bulkSyncUsers: (params: BulkSyncRequest) => Promise<BulkSyncResponse>;
/**
 * Webhook endpoint for Auth0 to notify about user changes
 * Configure this in Auth0 Dashboard under Monitoring > Logs > Log Streams
 */
interface Auth0WebhookEvent {
    type: string;
    user_id?: string;
    user?: {
        user_id: string;
        email: string;
        name?: string;
        app_metadata?: {
            department?: string;
            role?: string;
            manager_id?: number;
        };
    };
}
export declare const auth0Webhook: (params: Auth0WebhookEvent) => Promise<void>;
/**
 * Example API endpoint that returns user profile information
 * This endpoint is protected and requires Auth0 authentication
 */
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    department: string;
    role: string;
    auth0Sub: string;
}
export declare const getUserProfile: () => Promise<UserProfile>;
/**
 * Example API endpoint that returns user-specific leave balances
 * This demonstrates how to use authentication data in business logic
 */
export interface UserLeaveBalances {
    balances: Array<{
        leaveType: string;
        allocated: number;
        used: number;
        available: number;
    }>;
}
export declare const getUserLeaveBalances: () => Promise<UserLeaveBalances>;
/**
 * Example API endpoint for managers to get their team's information
 * This demonstrates role-based access control with Auth0
 */
export interface TeamMember {
    id: number;
    name: string;
    email: string;
    department: string;
    role: string;
}
export interface TeamInfo {
    members: TeamMember[];
}
export declare const getTeamInfo: () => Promise<TeamInfo>;
export {};
