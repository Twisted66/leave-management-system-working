import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';

interface AbsenceConversionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comments: string) => void;
  isLoading: boolean;
  action: 'approved' | 'rejected';
  request: any;
}

export default function AbsenceConversionApprovalDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  action,
  request
}: AbsenceConversionApprovalDialogProps) {
  const [comments, setComments] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(comments);
  };

  const resetForm = () => {
    setComments('');
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
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            {action === 'approved' ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <X className="h-5 w-5 text-red-600" />
            )}
            {action === 'approved' ? 'Approve' : 'Reject'} Absence Conversion Request
          </DialogTitle>
        </DialogHeader>

        {request && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">{request.employeeName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Absence on {new Date(request.absenceDate).toLocaleDateString()}
            </p>
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Justification:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{request.justification}</p>
            </div>
          </div>
        )}

        {action === 'approved' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 text-sm">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Approving this request will deduct 1 day from the employee's annual leave balance 
              and mark the absence as approved.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="comments" className="text-gray-900 dark:text-white">
              Comments {action === 'rejected' ? '(Required)' : '(Optional)'}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                action === 'approved' 
                  ? "Add any comments about the approval..."
                  : "Please provide a reason for rejection..."
              }
              rows={4}
              required={action === 'rejected'}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || (action === 'rejected' && !comments.trim())}
              className={`w-full sm:w-auto ${action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isLoading ? 'Processing...' : action === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
