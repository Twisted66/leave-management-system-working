import { api } from "encore.dev/api";
import { leaveDB } from "./db";
import type { Employee } from "./types";

interface ListEmployeesResponse {
  employees: Employee[];
}

// Retrieves all employees.
export const listEmployees = api<void, ListEmployeesResponse>(
  { expose: true, method: "GET", path: "/employees" },
  async () => {
    const employees = await leaveDB.queryAll<Employee>`
      SELECT 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
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
  { expose: true, method: "GET", path: "/employees/:id" },
  async ({ id }) => {
    const employee = await leaveDB.queryRow<Employee>`
      SELECT 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
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
}

// Creates a new employee and initializes their leave balances.
export const createEmployee = api<CreateEmployeeRequest, Employee>(
  { expose: true, method: "POST", path: "/employees" },
  async (req) => {
    const employee = await leaveDB.queryRow<Employee>`
      INSERT INTO employees (email, name, department, role, manager_id)
      VALUES (${req.email}, ${req.name}, ${req.department}, ${req.role}, ${req.managerId || null})
      RETURNING 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
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
