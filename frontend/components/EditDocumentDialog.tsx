import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { leave } from '~backend/client';

type CompanyDocument = leave.CompanyDocument;

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  document: CompanyDocument | null;
}

export default function EditDocumentDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  document
}: EditDocumentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expiryDate: undefined as Date | undefined,
  });

  useEffect(() => {
    if (document) {
      setFormData({
        name: document.name,
        description: document.description || '',
        expiryDate: document.expiryDate ? new Date(document.expiryDate) : undefined,
      });
    }
  }, [document]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;

    onSubmit({
      id: document.id,
      name: formData.name,
      description: formData.description || undefined,
      expiryDate: formData.expiryDate,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      expiryDate: undefined,
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
          <DialogTitle className="text-gray-900 dark:text-white">Edit Document</DialogTitle>
        </DialogHeader>

        {document && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">{document.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{document.documentType}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Uploaded by {document.uploaderName} on {new Date(document.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-900 dark:text-white">Document Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter document name"
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-900 dark:text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter document description"
              rows={3}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label className="text-gray-900 dark:text-white">Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                    !formData.expiryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expiryDate ? format(formData.expiryDate, "PPP") : "Select expiry date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 dark:bg-gray-700 dark:border-gray-600">
                <Calendar
                  mode="single"
                  selected={formData.expiryDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, expiryDate: date }))}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="dark:bg-gray-700"
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, expiryDate: undefined }))}
                className="text-xs"
              >
                Clear Date
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.name.trim()}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
