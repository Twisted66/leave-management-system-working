import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Download, 
  Trash2, 
  FileText, 
  Image, 
  File,
  Calendar,
  User,
  HardDrive
} from 'lucide-react';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface Document {
  id: number;
  name: string;
  documentType: string;
  filePath: string;
  fileSize: number;
  expiryDate?: Date | string;
  uploadedAt: Date | string;
  uploaderName?: string;
}

interface DocumentGridProps {
  documents: Document[];
  onDelete?: (documentId: number) => Promise<void>;
  canDelete?: boolean;
  canDownload?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DocumentGrid({
  documents,
  onDelete,
  canDelete = false,
  canDownload = true,
  isLoading = false,
  emptyMessage = "No documents found"
}: DocumentGridProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Get file extension
  const getFileExtension = (filePath: string): string => {
    return filePath.split('.').pop()?.toLowerCase() || '';
  };

  // Get file type for icon
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
      month: 'short',
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

  // Handle preview
  const handlePreview = (document: Document) => {
    setSelectedDocument(document);
    setIsPreviewOpen(true);
  };

  // Handle download
  const handleDownload = (document: Document, event: React.MouseEvent) => {
    event.stopPropagation();
    const link = document.createElement('a');
    link.href = document.filePath;
    link.download = document.name;
    link.click();
  };

  // Handle delete
  const handleDelete = async (document: Document, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDelete) {
      await onDelete(document.id);
    }
  };

  // Render file icon based on type
  const renderFileIcon = (filePath: string) => {
    const fileType = getFileType(filePath);
    
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'image':
        return <Image className="h-8 w-8 text-green-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-8 w-8 bg-gray-300 rounded"></div>
                <div className="h-6 w-16 bg-gray-300 rounded"></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
              </div>
              <div className="flex space-x-2 pt-2">
                <div className="h-8 bg-gray-300 rounded flex-1"></div>
                <div className="h-8 w-8 bg-gray-300 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {emptyMessage}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Documents will appear here once they are uploaded.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((document) => (
          <Card 
            key={document.id} 
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 group"
            onClick={() => handlePreview(document)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {renderFileIcon(document.filePath)}
                <Badge className={getDocumentTypeColor(document.documentType)}>
                  {document.documentType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardTitle className="text-sm font-medium line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {document.name}
              </CardTitle>
              
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <HardDrive className="h-3 w-3" />
                  <span>{formatFileSize(document.fileSize)}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(document.uploadedAt)}</span>
                </div>

                {document.expiryDate && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Expires: {formatDate(document.expiryDate)}</span>
                  </div>
                )}

                {document.uploaderName && (
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{document.uploaderName}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-1 pt-2">
                <Button 
                  size="sm" 
                  variant="default" 
                  className="flex-1 text-xs"
                  onClick={() => handlePreview(document)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                
                {canDownload && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => handleDownload(document, e)}
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
                
                {canDelete && onDelete && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => handleDelete(document, e)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      {selectedDocument && (
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
          onDelete={onDelete}
          canDelete={canDelete}
          canDownload={canDownload}
        />
      )}
    </>
  );
}