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

type Employee = leave.Employee;

interface CreateAbsenceRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  employees: Employee[];
}

export default function CreateAbsenceRecordDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  employees
}: CreateAbsenceRecordDialogProps) {
  const [formData, setFormData] = useState({
    employeeId: '',
    absenceDate: undefined as Date | undefined,
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.absenceDate) {
      return;
    }

    onSubmit({
      employeeId: parseInt(formData.employeeId),
      absenceDate: formData.absenceDate,
      reason: formData.reason || undefined,
    });
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      absenceDate: undefined,
      reason: '',
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Record Employee Absence</DialogTitle>
        </DialogHeader>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
          <h3 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">About Absence Records</h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Use this to record unauthorized absences. Employees will be notified and can request 
            to convert the absence into annual leave deductions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employee" className="text-gray-900 dark:text-white">Employee</Label>
            <Select value={formData.employeeId} onValueChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()} className="dark:text-white">
                    {employee.name} - {employee.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-900 dark:text-white">Absence Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                    !formData.absenceDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.absenceDate ? format(formData.absenceDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 dark:bg-gray-700 dark:border-gray-600">
                <Calendar
                  mode="single"
                  selected={formData.absenceDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, absenceDate: date }))}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="dark:bg-gray-700"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="reason" className="text-gray-900 dark:text-white">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Provide additional context about the absence..."
              rows={3}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.employeeId || !formData.absenceDate}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Recording...' : 'Record Absence'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
