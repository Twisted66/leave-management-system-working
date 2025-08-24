import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import backend from '../lib/client';
import type { leave } from '~backend/client';

type Employee = leave.Employee;
type LeaveType = leave.LeaveType;

interface EditBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  employee: Employee | null;
  leaveTypes: LeaveType[];
}

export default function EditBalanceDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  employee,
  leaveTypes
}: EditBalanceDialogProps) {
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    allocatedDays: '',
    carriedForwardDays: '',
  });

  const { data: balances } = useQuery({
    queryKey: ['balances', employee?.id],
    queryFn: () => employee ? backend.leave.getEmployeeBalances(employee.id) : null,
    enabled: !!employee && open,
  });

  useEffect(() => {
    if (balances?.balances.length && formData.leaveTypeId) {
      const balance = balances.balances.find((b: any) => b.leaveTypeId === parseInt(formData.leaveTypeId));
      if (balance) {
        setFormData(prev => ({
          ...prev,
          allocatedDays: balance.allocatedDays.toString(),
          carriedForwardDays: balance.carriedForwardDays.toString(),
        }));
      }
    }
  }, [balances, formData.leaveTypeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !formData.leaveTypeId) return;

    onSubmit({
      employeeId: employee.id,
      leaveTypeId: parseInt(formData.leaveTypeId),
      allocatedDays: parseInt(formData.allocatedDays),
      carriedForwardDays: parseInt(formData.carriedForwardDays),
    });
  };

  const resetForm = () => {
    setFormData({
      leaveTypeId: '',
      allocatedDays: '',
      carriedForwardDays: '',
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const selectedBalance = balances?.balances.find((b: any) => b.leaveTypeId === parseInt(formData.leaveTypeId));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Edit Leave Balance</DialogTitle>
        </DialogHeader>

        {employee && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">{employee.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{employee.department}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="leaveType" className="text-gray-900 dark:text-white">Leave Type</Label>
            <Select value={formData.leaveTypeId} onValueChange={(value) => setFormData(prev => ({ ...prev, leaveTypeId: value }))}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()} className="dark:text-white">
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBalance && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
              <p className="text-gray-900 dark:text-white"><strong>Current Balance:</strong></p>
              <p className="text-gray-700 dark:text-gray-300">Allocated: {selectedBalance.allocatedDays} days</p>
              <p className="text-gray-700 dark:text-gray-300">Used: {selectedBalance.usedDays} days</p>
              <p className="text-gray-700 dark:text-gray-300">Carried Forward: {selectedBalance.carriedForwardDays} days</p>
              <p className="text-gray-700 dark:text-gray-300">Available: {selectedBalance.availableDays} days</p>
            </div>
          )}

          <div>
            <Label htmlFor="allocatedDays" className="text-gray-900 dark:text-white">Allocated Days</Label>
            <Input
              id="allocatedDays"
              type="number"
              min="0"
              value={formData.allocatedDays}
              onChange={(e) => setFormData(prev => ({ ...prev, allocatedDays: e.target.value }))}
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="carriedForwardDays" className="text-gray-900 dark:text-white">Carried Forward Days</Label>
            <Input
              id="carriedForwardDays"
              type="number"
              min="0"
              value={formData.carriedForwardDays}
              onChange={(e) => setFormData(prev => ({ ...prev, carriedForwardDays: e.target.value }))}
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.leaveTypeId} className="w-full sm:w-auto">
              {isLoading ? 'Updating...' : 'Update Balance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
