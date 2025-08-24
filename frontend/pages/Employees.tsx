import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit } from 'lucide-react';
import backend from '../lib/client';
import { useUser } from '../contexts/UserContext';
import CreateEmployeeDialog from '../components/CreateEmployeeDialog';
import EditBalanceDialog from '../components/EditBalanceDialog';
import { useToast } from '@/components/ui/use-toast';

export default function Employees() {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditBalanceDialog, setShowEditBalanceDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => backend.leave.listEmployees(),
    enabled: currentUser?.role === 'hr',
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => backend.leave.listLeaveTypes(),
  });

  const createEmployeeMutation = useMutation({
    mutationFn: backend.leave.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowCreateDialog(false);
      toast({
        title: 'Success',
        description: 'Employee created successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to create employee:', error);
      toast({
        title: 'Error',
        description: 'Failed to create employee',
        variant: 'destructive',
      });
    },
  });

  const updateBalanceMutation = useMutation({
    mutationFn: backend.leave.updateBalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      setShowEditBalanceDialog(false);
      setSelectedEmployee(null);
      toast({
        title: 'Success',
        description: 'Balance updated successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to update balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update balance',
        variant: 'destructive',
      });
    },
  });

  const handleEditBalance = (employee: any) => {
    setSelectedEmployee(employee);
    setShowEditBalanceDialog(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'hr':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">HR</Badge>;
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Manager</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Employee</Badge>;
    }
  };

  if (currentUser?.role !== 'hr') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage employees and their leave balances</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Employee Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {!employees?.employees.length ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No employees found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.employees.map((employee: any) => (
                <div key={employee.id} className="border dark:border-gray-600 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{employee.name}</h3>
                        {getRoleBadge(employee.role)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{employee.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{employee.department}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Joined {new Date(employee.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {employee.role !== 'hr' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBalance(employee)}
                        className="w-full sm:w-auto flex-shrink-0"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Balance
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEmployeeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => createEmployeeMutation.mutate(data)}
        isLoading={createEmployeeMutation.isPending}
        employees={employees?.employees || []}
      />

      <EditBalanceDialog
        open={showEditBalanceDialog}
        onOpenChange={setShowEditBalanceDialog}
        onSubmit={(data) => updateBalanceMutation.mutate(data)}
        isLoading={updateBalanceMutation.isPending}
        employee={selectedEmployee}
        leaveTypes={leaveTypes?.leaveTypes || []}
      />
    </div>
  );
}
