import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { leave } from '~backend/client';

type AbsenceRecord = leave.AbsenceRecord;

interface CreateAbsenceConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  absenceRecords: AbsenceRecord[];
}

export default function CreateAbsenceConversionDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  absenceRecords
}: CreateAbsenceConversionDialogProps) {
  const [formData, setFormData] = useState({
    absenceRecordId: '',
    justification: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.absenceRecordId || !formData.justification.trim()) {
      return;
    }

    onSubmit({
      absenceRecordId: parseInt(formData.absenceRecordId),
      justification: formData.justification,
    });
  };

  const resetForm = () => {
    setFormData({
      absenceRecordId: '',
      justification: '',
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const selectedAbsence = absenceRecords.find(record => record.id === parseInt(formData.absenceRecordId));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Request Absence Conversion</DialogTitle>
        </DialogHeader>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
          <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">About Absence Conversion</h3>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            You can request to convert unauthorized absences into annual leave deductions. 
            If approved, 1 day will be deducted from your annual leave balance for each absence.
          </p>
        </div>

        {absenceRecords.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No unauthorized absences to convert</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="absenceRecord" className="text-gray-900 dark:text-white">Select Absence</Label>
              <Select value={formData.absenceRecordId} onValueChange={(value) => setFormData(prev => ({ ...prev, absenceRecordId: value }))}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select an absence to convert" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  {absenceRecords.map((record) => (
                    <SelectItem key={record.id} value={record.id.toString()} className="dark:text-white">
                      {new Date(record.absenceDate).toLocaleDateString()}
                      {record.reason && ` - ${record.reason}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAbsence && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-sm">
                <p className="text-gray-900 dark:text-white"><strong>Selected Absence:</strong></p>
                <p className="text-gray-700 dark:text-gray-300">Date: {new Date(selectedAbsence.absenceDate).toLocaleDateString()}</p>
                {selectedAbsence.reason && (
                  <p className="text-gray-700 dark:text-gray-300">Reason: {selectedAbsence.reason}</p>
                )}
                <p className="text-gray-700 dark:text-gray-300">Recorded by: {selectedAbsence.createdByName}</p>
              </div>
            )}

            <div>
              <Label htmlFor="justification" className="text-gray-900 dark:text-white">Justification (Required)</Label>
              <Textarea
                id="justification"
                value={formData.justification}
                onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                placeholder="Please provide a detailed justification for why this absence should be converted to annual leave..."
                rows={4}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Explain the circumstances that led to the absence and why it should be approved.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm">
              <p className="text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> If approved, this will deduct 1 day from your annual leave balance. 
                The request will be reviewed by your manager or HR.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.absenceRecordId || !formData.justification.trim()}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
