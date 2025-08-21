import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export default function CreateDocumentDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading
}: CreateDocumentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    documentType: 'license' as 'license' | 'certificate' | 'policy' | 'other',
    expiryDate: undefined as Date | undefined,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const base64String = base64Data.split(',')[1]; // Remove data:...;base64, prefix

      onSubmit({
        name: formData.name,
        description: formData.description || undefined,
        documentType: formData.documentType,
        expiryDate: formData.expiryDate,
        filename: selectedFile.name,
        fileData: base64String,
        fileSize: selectedFile.size,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      documentType: 'license',
      expiryDate: undefined,
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
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Upload Company Document</DialogTitle>
        </DialogHeader>

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
            <Label htmlFor="description" className="text-gray-900 dark:text-white">Description (Optional)</Label>
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
            <Label htmlFor="documentType" className="text-gray-900 dark:text-white">Document Type</Label>
            <Select value={formData.documentType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, documentType: value }))}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                <SelectItem value="license" className="dark:text-white">License</SelectItem>
                <SelectItem value="certificate" className="dark:text-white">Certificate</SelectItem>
                <SelectItem value="policy" className="dark:text-white">Policy</SelectItem>
                <SelectItem value="other" className="dark:text-white">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-900 dark:text-white">Expiry Date (Optional)</Label>
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
          </div>

          <div>
            <Label htmlFor="file" className="text-gray-900 dark:text-white">Document File</Label>
            <div className="mt-1">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                required
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>Selected: {selectedFile.name}</p>
                  <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>Supported formats:</strong> PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT
            </p>
            <p className="text-blue-800 dark:text-blue-200 mt-1">
              <strong>Max file size:</strong> 10 MB
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedFile || !formData.name.trim()}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isLoading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
