import { Header, Cookie } from "encore.dev/api";
import type { Employee } from "./types";
import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: AuthData;
        }
    }
}
interface AuthParams {
    authorization?: Header<"Authorization">;
    session?: Cookie<"session">;
}
export interface AuthData {
    userID: string;
    email: string;
    role: 'employee' | 'manager' | 'hr';
    auth0Sub: string;
}
/**
 * Authentication middleware for Express
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Role-based authorization middleware
 */
export declare const authorize: (roles: ("employee" | "manager" | "hr")[]) => (req: Request, res: Response, next: NextFunction) => undefined;
export declare const auth: import("encore.dev/auth").AuthHandler<AuthParams, AuthData>;
interface LoginRequest {
    email: string;
    password: string;
}
interface LoginResponse {
    employee: Employee;
    token: string;
}
export declare const login: (params: LoginRequest) => Promise<LoginResponse>;
interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    department: string;
    role?: 'employee' | 'manager' | 'hr';
    managerId?: number;
}
export declare const register: (params: RegisterRequest) => Promise<LoginResponse>;
export {};
