import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { leave } from '~backend/client';

type LeaveType = leave.LeaveType;
type LeaveBalance = leave.LeaveBalance;
type Employee = leave.Employee;

interface CreateLeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  currentUser: Employee | null;
}

export default function CreateLeaveRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  leaveTypes,
  balances,
  currentUser
}: CreateLeaveRequestDialogProps) {
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reason: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !currentUser) {
      return;
    }

    onSubmit({
      employeeId: currentUser.id,
      leaveTypeId: parseInt(formData.leaveTypeId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const selectedBalance = balances.find(b => b.leaveTypeId === parseInt(formData.leaveTypeId));
  const calculateBusinessDays = (start: Date, end: Date): number => {
    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const daysRequested = formData.startDate && formData.endDate 
    ? calculateBusinessDays(formData.startDate, formData.endDate)
    : 0;

  const hasInsufficientBalance = selectedBalance && daysRequested > selectedBalance.availableDays;

  const resetForm = () => {
    setFormData({
      leaveTypeId: '',
      startDate: undefined,
      endDate: undefined,
      reason: '',
    });
    setSelectedFile(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Submit Leave Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="leaveType" className="text-gray-900 dark:text-white">Leave Type</Label>
            <Select value={formData.leaveTypeId} onValueChange={(value) => setFormData(prev => ({ ...prev, leaveTypeId: value }))}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                {leaveTypes.map((type) => {
                  const balance = balances.find(b => b.leaveTypeId === type.id);
                  return (
                    <SelectItem key={type.id} value={type.id.toString()} className="dark:text-white">
                      {type.name} ({balance?.availableDays || 0} days available)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-gray-900 dark:text-white">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 dark:bg-gray-700 dark:border-gray-600">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="dark:bg-gray-700"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-gray-900 dark:text-white">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 dark:bg-gray-700 dark:border-gray-600">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                    disabled={(date) => date < (formData.startDate || new Date())}
                    initialFocus
                    className="dark:bg-gray-700"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {daysRequested > 0 && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              hasInsufficientBalance 
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300" 
                : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
            )}>
              <p>
                <strong>Days requested:</strong> {daysRequested} business days
              </p>
              {selectedBalance && (
                <p>
                  <strong>Available balance:</strong> {selectedBalance.availableDays} days
                </p>
              )}
              {hasInsufficientBalance && (
                <p className="font-medium">Insufficient leave balance!</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="reason" className="text-gray-900 dark:text-white">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Provide a reason for your leave request..."
              rows={3}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="document" className="text-gray-900 dark:text-white">Supporting Document (Optional)</Label>
            <div className="mt-1">
              <Input
                id="document"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.leaveTypeId || !formData.startDate || !formData.endDate || hasInsufficientBalance}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
