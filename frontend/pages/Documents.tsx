import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, Edit, Trash2, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useBackend } from '../hooks/useBackend';
import CreateDocumentDialog from '../components/CreateDocumentDialog';
import EditDocumentDialog from '../components/EditDocumentDialog';
import { useToast } from '@/components/ui/use-toast';
import ProtectedRoute from '../components/ProtectedRoute';

function DocumentsContent() {
  const { currentUser } = useUser();
  const backend = useBackend();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('');

  const { data: documents } = useQuery({
    queryKey: ['documents', documentTypeFilter],
    queryFn: () => backend.leave.listDocuments({ documentType: documentTypeFilter || undefined }),
    enabled: currentUser?.role === 'hr',
  });

  const { data: expiringDocuments } = useQuery({
    queryKey: ['expiring-documents'],
    queryFn: () => backend.leave.getExpiringDocuments(),
    enabled: currentUser?.role === 'hr',
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      // First upload the file
      const uploadResponse = await backend.storage.uploadCompanyDocument({
        filename: data.filename,
        fileData: data.fileData,
        documentType: data.documentType,
      });

      // Then create the document record
      return backend.leave.createDocument({
        name: data.name,
        description: data.description,
        documentType: data.documentType,
        filePath: uploadResponse.filePath,
        fileSize: data.fileSize,
        expiryDate: data.expiryDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-documents'] });
      setShowCreateDialog(false);
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to upload document:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: (data: { id: number; name?: string; description?: string; expiryDate?: string }) => 
      backend.leave.updateDocument(data.id, { 
        name: data.name, 
        description: data.description, 
        expiryDate: data.expiryDate 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-documents'] });
      setShowEditDialog(false);
      setSelectedDocument(null);
      toast({
        title: 'Success',
        description: 'Document updated successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to update document:', error);
      toast({
        title: 'Error',
        description: 'Failed to update document',
        variant: 'destructive',
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (data: { id: number }) => backend.leave.deleteDocument(data.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-documents'] });
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to delete document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });

  const sendNotificationsMutation = useMutation({
    mutationFn: backend.leave.checkExpiringDocuments,
    onSuccess: (result: any) => {
      toast({
        title: 'Success',
        description: `${result.notificationsSent} expiry notifications sent`,
      });
    },
    onError: (error) => {
      console.error('Failed to send notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to send notifications',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (document: any) => {
    setSelectedDocument(document);
    setShowEditDialog(true);
  };

  const handleDelete = async (documentId: number) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteDocumentMutation.mutate({ id: documentId });
    }
  };

  const handleDownload = async (document: any) => {
    try {
      const response = await backend.storage.getCompanyDocument(document.filePath);
      window.open(response.downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to download document:', error);
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    const colors = {
      license: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      certificate: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      policy: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return <Badge className={colors[type as keyof typeof colors] || colors.other}>{type}</Badge>;
  };

  const getExpiryStatus = (expiryDate: Date | undefined) => {
    if (!expiryDate) return null;

    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Expires Soon</Badge>;
    }
    return null;
  };

  const DocumentCard = ({ document }: { document: any }) => (
    <div className="border dark:border-gray-600 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">{document.name}</h3>
            {getDocumentTypeBadge(document.documentType)}
            {getExpiryStatus(document.expiryDate)}
          </div>
          {document.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{document.description}</p>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
            <p>Uploaded by {document.uploaderName} on {new Date(document.uploadedAt).toLocaleDateString()}</p>
            {document.expiryDate && (
              <p>Expires: {new Date(document.expiryDate).toLocaleDateString()}</p>
            )}
            <p>Size: {(document.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownload(document)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(document)}
            className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(document.id)}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Documents</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage company licenses, certificates, and policies</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => sendNotificationsMutation.mutate()}
            variant="outline"
            disabled={sendNotificationsMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {sendNotificationsMutation.isPending ? 'Sending...' : 'Send Expiry Alerts'}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      {expiringDocuments && expiringDocuments.documents.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-5 w-5" />
              Documents Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 dark:text-orange-300 mb-4">
              {expiringDocuments.documents.length} document(s) will expire within the next 30 days.
            </p>
            <div className="space-y-2">
              {expiringDocuments.documents.slice(0, 3).map((doc: any) => (
                <div key={doc.id} className="flex justify-between items-center text-sm">
                  <span className="text-orange-800 dark:text-orange-200 truncate pr-2">{doc.name}</span>
                  <span className="text-orange-600 dark:text-orange-400 flex-shrink-0">
                    {new Date(doc.expiryDate!).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {expiringDocuments.documents.length > 3 && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  And {expiringDocuments.documents.length - 3} more...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{documents?.documents.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Licenses</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {documents?.documents.filter((d: any) => d.documentType === 'license').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Certificates</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {documents?.documents.filter((d: any) => d.documentType === 'certificate').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {expiringDocuments?.documents.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-5">
            <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
            <TabsTrigger value="license" className="text-sm">Licenses</TabsTrigger>
            <TabsTrigger value="certificate" className="text-sm">Certificates</TabsTrigger>
            <TabsTrigger value="policy" className="text-sm">Policies</TabsTrigger>
            <TabsTrigger value="expiring" className="text-sm">Expiring</TabsTrigger>
          </TabsList>

          <div className="w-full sm:w-48">
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                <SelectItem value="" className="dark:text-white">All types</SelectItem>
                <SelectItem value="license" className="dark:text-white">License</SelectItem>
                <SelectItem value="certificate" className="dark:text-white">Certificate</SelectItem>
                <SelectItem value="policy" className="dark:text-white">Policy</SelectItem>
                <SelectItem value="other" className="dark:text-white">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="all">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">All Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {!documents?.documents.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No documents found</p>
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    Upload your first document
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.documents.map((document: any) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="license">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents?.documents.filter((d: any) => d.documentType === 'license').map((document: any) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificate">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents?.documents.filter((d: any) => d.documentType === 'certificate').map((document: any) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents?.documents.filter((d: any) => d.documentType === 'policy').map((document: any) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Expiring Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {!expiringDocuments?.documents.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No documents expiring soon</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expiringDocuments.documents.map((document: any) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateDocumentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => uploadDocumentMutation.mutate(data)}
        isLoading={uploadDocumentMutation.isPending}
      />

      <EditDocumentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={(data) => updateDocumentMutation.mutate(data)}
        isLoading={updateDocumentMutation.isPending}
        document={selectedDocument}
      />
    </div>
  );
}

export default function Documents() {
  return (
    <ProtectedRoute requiredRole="hr">
      <DocumentsContent />
    </ProtectedRoute>
  );
}