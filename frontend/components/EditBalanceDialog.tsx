import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import backend from '~backend/client';
import type { Employee, LeaveType } from '~backend/leave/types';

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
    queryFn: () => employee ? backend.leave.getEmployeeBalances({ employeeId: employee.id }) : null,
    enabled: !!employee && open,
  });

  useEffect(() => {
    if (balances?.balances.length && formData.leaveTypeId) {
      const balance = balances.balances.find(b => b.leaveTypeId === parseInt(formData.leaveTypeId));
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

  const selectedBalance = balances?.balances.find(b => b.leaveTypeId === parseInt(formData.leaveTypeId));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Leave Balance</DialogTitle>
        </DialogHeader>

        {employee && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium">{employee.name}</h3>
            <p className="text-sm text-gray-600">{employee.department}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="leaveType">Leave Type</Label>
            <Select value={formData.leaveTypeId} onValueChange={(value) => setFormData(prev => ({ ...prev, leaveTypeId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBalance && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p><strong>Current Balance:</strong></p>
              <p>Allocated: {selectedBalance.allocatedDays} days</p>
              <p>Used: {selectedBalance.usedDays} days</p>
              <p>Carried Forward: {selectedBalance.carriedForwardDays} days</p>
              <p>Available: {selectedBalance.availableDays} days</p>
            </div>
          )}

          <div>
            <Label htmlFor="allocatedDays">Allocated Days</Label>
            <Input
              id="allocatedDays"
              type="number"
              min="0"
              value={formData.allocatedDays}
              onChange={(e) => setFormData(prev => ({ ...prev, allocatedDays: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="carriedForwardDays">Carried Forward Days</Label>
            <Input
              id="carriedForwardDays"
              type="number"
              min="0"
              value={formData.carriedForwardDays}
              onChange={(e) => setFormData(prev => ({ ...prev, carriedForwardDays: e.target.value }))}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.leaveTypeId}>
              {isLoading ? 'Updating...' : 'Update Balance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
