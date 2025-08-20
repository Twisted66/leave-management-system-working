import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit } from 'lucide-react';
import backend from '~backend/client';
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
        return <Badge className="bg-purple-100 text-purple-800">HR</Badge>;
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-800">Manager</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Employee</Badge>;
    }
  };

  if (currentUser?.role !== 'hr') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600">Manage employees and their leave balances</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {!employees?.employees.length ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No employees found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.employees.map((employee) => (
                <div key={employee.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{employee.name}</h3>
                        {getRoleBadge(employee.role)}
                      </div>
                      <p className="text-sm text-gray-600">{employee.email}</p>
                      <p className="text-sm text-gray-600">{employee.department}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Joined {new Date(employee.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {employee.role !== 'hr' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBalance(employee)}
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
