import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
import type { Employee } from "./types";
import * as bcrypt from "bcrypt";

// Import admin, cache, and types modules to ensure they get compiled and endpoints are exposed
import "./admin";
import "./cache";
import "./types";

interface ListEmployeesResponse {
  employees: Employee[];
}

// Retrieves all employees.
export const listEmployees = api<void, ListEmployeesResponse>(
  { expose: true, method: "GET", path: "/employees", auth: true },
  async () => {
    const auth = getAuthData()!;
    
    // Only HR can list all employees
    if (auth.role !== 'hr') {
      throw new Error("Access denied. HR role required.");
    }

    const employees = await leaveDB.queryAll<Employee>`
      SELECT 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
        profile_image_url as "profileImageUrl",
        created_at as "createdAt"
      FROM employees
      ORDER BY name
    `;
    return { employees };
  }
);

interface GetEmployeeParams {
  id: number;
}

// Retrieves a specific employee by ID.
export const getEmployee = api<GetEmployeeParams, Employee>(
  { expose: true, method: "GET", path: "/employees/:id", auth: true },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Employees can only view their own profile
    if (auth.role === 'employee' && id !== parseInt(auth.userID)) {
      throw new Error("You can only view your own profile");
    }

    // Managers can view their team members' profiles
    if (auth.role === 'manager') {
      const isAuthorized = await leaveDB.queryRow<{count: number}>`
        SELECT COUNT(*) as count FROM employees 
        WHERE id = ${id} AND (manager_id = ${parseInt(auth.userID)} OR id = ${parseInt(auth.userID)})
      `;
      if (!isAuthorized || isAuthorized.count === 0) {
        throw new Error("You can only view your own profile or your team members' profiles");
      }
    }

    const employee = await leaveDB.queryRow<Employee>`
      SELECT 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
        profile_image_url as "profileImageUrl",
        created_at as "createdAt"
      FROM employees
      WHERE id = ${id}
    `;
    if (!employee) {
      throw new Error("Employee not found");
    }
    return employee;
  }
);

interface CreateEmployeeRequest {
  email: string;
  name: string;
  department: string;
  role: 'employee' | 'manager' | 'hr';
  managerId?: number;
  password: string;
}

// Creates a new employee and initializes their leave balances.
export const createEmployee = api<CreateEmployeeRequest, Employee>(
  { expose: true, method: "POST", path: "/employees", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can create employees
    if (auth.role !== 'hr') {
      throw new Error("Access denied. HR role required.");
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(req.password, saltRounds);

    const employee = await leaveDB.queryRow<Employee>`
      INSERT INTO employees (email, name, department, role, manager_id, password_hash)
      VALUES (${req.email}, ${req.name}, ${req.department}, ${req.role}, ${req.managerId || null}, ${passwordHash})
      RETURNING 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
        profile_image_url as "profileImageUrl",
        created_at as "createdAt"
    `;

    if (!employee) {
      throw new Error("Failed to create employee");
    }

    // Initialize leave balances for the new employee
    if (req.role !== 'hr') {
      await leaveDB.exec`
        INSERT INTO employee_leave_balances (employee_id, leave_type_id, year, allocated_days)
        SELECT 
          ${employee.id} as employee_id,
          lt.id as leave_type_id,
          EXTRACT(YEAR FROM NOW()) as year,
          lt.annual_allocation as allocated_days
        FROM leave_types lt
      `;
    }

    return employee;
  }
);

interface UpdateEmployeeProfileRequest {
  id: number;
  name?: string;
  department?: string;
  profileImageUrl?: string;
}

// Updates an employee's profile information.
export const updateEmployeeProfile = api<UpdateEmployeeProfileRequest, Employee>(
  { expose: true, method: "PUT", path: "/employees/:id/profile", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Employees can only update their own profile
    if (auth.role === 'employee' && req.id !== parseInt(auth.userID)) {
      throw new Error("You can only update your own profile");
    }

    // Managers can update their own profile or their team members' profiles (limited fields)
    if (auth.role === 'manager' && req.id !== parseInt(auth.userID)) {
      const isTeamMember = await leaveDB.queryRow<{count: number}>`
        SELECT COUNT(*) as count FROM employees 
        WHERE id = ${req.id} AND manager_id = ${parseInt(auth.userID)}
      `;
      if (!isTeamMember || isTeamMember.count === 0) {
        throw new Error("You can only update your own profile or your team members' profiles");
      }
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (req.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(req.name);
    }

    if (req.department !== undefined) {
      updateFields.push(`department = $${paramIndex++}`);
      updateValues.push(req.department);
    }

    if (req.profileImageUrl !== undefined) {
      updateFields.push(`profile_image_url = $${paramIndex++}`);
      updateValues.push(req.profileImageUrl);
    }

    if (updateFields.length === 0) {
      throw new Error("No fields to update");
    }

    updateValues.push(req.id);

    const query = `
      UPDATE employees 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
        profile_image_url as "profileImageUrl",
        created_at as "createdAt"
    `;

    const employee = await leaveDB.rawQueryRow<Employee>(query, ...updateValues);

    if (!employee) {
      throw new Error("Employee not found");
    }

    return employee;
  }
);
