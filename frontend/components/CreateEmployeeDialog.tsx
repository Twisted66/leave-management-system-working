import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { leave } from '~backend/client';

type Employee = leave.Employee;

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  employees: Employee[];
}

export default function CreateEmployeeDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  employees
}: CreateEmployeeDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    department: '',
    role: 'employee' as 'employee' | 'manager' | 'hr',
    managerId: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      managerId: formData.managerId ? parseInt(formData.managerId) : undefined,
    });
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      department: '',
      role: 'employee',
      managerId: '',
      password: '',
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const managers = employees.filter(emp => emp.role === 'manager');
  const departments = [...new Set(employees.map(emp => emp.department))];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-900 dark:text-white">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-900 dark:text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-900 dark:text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum 6 characters
            </p>
          </div>

          <div>
            <Label htmlFor="department" className="text-gray-900 dark:text-white">Department</Label>
            <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Select or enter department" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept} className="dark:text-white">{dept}</SelectItem>
                ))}
                <SelectItem value="Engineering" className="dark:text-white">Engineering</SelectItem>
                <SelectItem value="Marketing" className="dark:text-white">Marketing</SelectItem>
                <SelectItem value="Sales" className="dark:text-white">Sales</SelectItem>
                <SelectItem value="Finance" className="dark:text-white">Finance</SelectItem>
                <SelectItem value="Operations" className="dark:text-white">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="role" className="text-gray-900 dark:text-white">Role</Label>
            <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                <SelectItem value="employee" className="dark:text-white">Employee</SelectItem>
                <SelectItem value="manager" className="dark:text-white">Manager</SelectItem>
                <SelectItem value="hr" className="dark:text-white">HR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.role === 'employee' && (
            <div>
              <Label htmlFor="manager" className="text-gray-900 dark:text-white">Manager</Label>
              <Select value={formData.managerId} onValueChange={(value) => setFormData(prev => ({ ...prev, managerId: value }))}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id.toString()} className="dark:text-white">
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Creating...' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
