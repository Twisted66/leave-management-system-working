import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Trash2, 
  X, 
  FileText, 
  Image, 
  File,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: number;
    name: string;
    documentType: string;
    filePath: string;
    fileSize: number;
    expiryDate?: Date | string;
    uploadedAt: Date | string;
    uploaderName?: string;
  };
  onDelete?: (documentId: number) => void;
  canDelete?: boolean;
  canDownload?: boolean;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  onDelete,
  canDelete = false,
  canDownload = true
}: DocumentPreviewModalProps) {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get file extension and type
  const getFileExtension = (filePath: string): string => {
    return filePath.split('.').pop()?.toLowerCase() || '';
  };

  const getFileType = (filePath: string): 'pdf' | 'image' | 'other' => {
    const extension = getFileExtension(filePath);
    
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'image';
    return 'other';
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get document type badge color
  const getDocumentTypeColor = (type: string): string => {
    switch (type) {
      case 'license': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'certificate': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'policy': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Handle download
  const handleDownload = async () => {
    setIsLoading(true);
    try {
      // Create a download link
      const link = document.createElement('a');
      link.href = document.filePath;
      link.download = document.name;
      link.click();
      
      toast({
        title: 'Download Started',
        description: 'The document download has started.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download the document.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsLoading(true);
    try {
      await onDelete(document.id);
      onClose();
      toast({
        title: 'Document Deleted',
        description: 'The document has been deleted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the document.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleResetZoom = () => setZoom(100);

  // Handle rotation
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const fileType = getFileType(document.filePath);

  // Render preview content based on file type
  const renderPreviewContent = () => {
    if (fileType === 'pdf') {
      return (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-full h-96 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <iframe
              src={`${document.filePath}#zoom=${zoom}`}
              className="w-full h-full rounded-lg"
              title="PDF Preview"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom}>
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (fileType === 'image') {
      return (
        <div className="flex flex-col items-center space-y-4">
          <div className="max-w-full max-h-96 overflow-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <img
              src={document.filePath}
              alt={document.name}
              className="max-w-full h-auto rounded-lg"
              style={{ 
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom}>
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // For other file types, show file icon and information
    return (
      <div className="flex flex-col items-center space-y-6 p-8">
        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <File className="h-12 w-12 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            Preview not available
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This file type ({getFileExtension(document.filePath).toUpperCase()}) cannot be previewed in the browser.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use the download button to view the document.
          </p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {fileType === 'pdf' && <FileText className="h-5 w-5 text-red-500" />}
                {fileType === 'image' && <Image className="h-5 w-5 text-green-500" />}
                {fileType === 'other' && <File className="h-5 w-5 text-gray-500" />}
                <DialogTitle className="text-lg font-semibold">
                  {document.name}
                </DialogTitle>
              </div>
              <Badge className={getDocumentTypeColor(document.documentType)}>
                {document.documentType}
              </Badge>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document metadata */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">File Size:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{formatFileSize(document.fileSize)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Uploaded:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{formatDate(document.uploadedAt)}</span>
              </div>
              {document.expiryDate && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Expires:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{formatDate(document.expiryDate)}</span>
                </div>
              )}
              {document.uploaderName && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Uploaded by:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{document.uploaderName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Document preview */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {renderPreviewContent()}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {canDownload && (
                <Button onClick={handleDownload} disabled={isLoading}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => window.open(document.filePath, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
            {canDelete && onDelete && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}