import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comments: string) => void;
  isLoading: boolean;
  action: 'approved' | 'rejected';
  request: any;
}

export default function ApprovalDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  action,
  request
}: ApprovalDialogProps) {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'approved' ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <X className="h-5 w-5 text-red-600" />
            )}
            {action === 'approved' ? 'Approve' : 'Reject'} Leave Request
          </DialogTitle>
        </DialogHeader>

        {request && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium">{request.employeeName}</h3>
            <p className="text-sm text-gray-600">{request.leaveTypeName}</p>
            <p className="text-sm text-gray-600">
              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">{request.daysRequested} days</p>
            {request.reason && (
              <p className="text-sm text-gray-700 mt-2">
                <strong>Reason:</strong> {request.reason}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="comments">
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
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || (action === 'rejected' && !comments.trim())}
              className={action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isLoading ? 'Processing...' : action === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
