import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X } from 'lucide-react';
import backend from '~backend/client';
import { useUser } from '../contexts/UserContext';
import ApprovalDialog from '../components/ApprovalDialog';
import { useToast } from '@/components/ui/use-toast';

export default function LeaveRequests() {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>('approved');

  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-requests', currentUser?.id],
    queryFn: () => {
      if (currentUser?.role === 'manager') {
        return backend.leave.listLeaveRequests({ managerId: currentUser.id, status: 'pending' });
      } else if (currentUser?.role === 'hr') {
        return backend.leave.listLeaveRequests({ status: 'pending' });
      }
      return null;
    },
    enabled: !!currentUser && (currentUser.role === 'manager' || currentUser.role === 'hr'),
  });

  const { data: allRequests } = useQuery({
    queryKey: ['all-requests', currentUser?.id],
    queryFn: () => {
      if (currentUser?.role === 'manager') {
        return backend.leave.listLeaveRequests({ managerId: currentUser.id });
      } else if (currentUser?.role === 'hr') {
        return backend.leave.listLeaveRequests({});
      }
      return null;
    },
    enabled: !!currentUser && (currentUser.role === 'manager' || currentUser.role === 'hr'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: backend.leave.updateLeaveRequestStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-requests'] });
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      toast({
        title: 'Success',
        description: `Leave request ${approvalAction} successfully`,
      });
    },
    onError: (error) => {
      console.error('Failed to update leave request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update leave request',
        variant: 'destructive',
      });
    },
  });

  const handleApproval = (request: any, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  const handleSubmitApproval = (comments: string) => {
    if (!selectedRequest || !currentUser) return;

    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status: approvalAction,
      managerComments: comments,
      approvedBy: currentUser.id,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
    }
  };

  const RequestCard = ({ request, showActions = false }: { request: any; showActions?: boolean }) => (
    <div key={request.id} className="border dark:border-gray-600 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{request.employeeName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{request.leaveTypeName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{request.daysRequested} days</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusBadge(request.status)}
          {showActions && request.status === 'pending' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApproval(request, 'approved')}
                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApproval(request, 'rejected')}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {request.reason && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          <strong>Reason:</strong> {request.reason}
        </p>
      )}
      
      {request.managerComments && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded mt-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Manager Comments:</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{request.managerComments}</p>
          {request.approverName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              By {request.approverName} on {new Date(request.approvedAt!).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Submitted on {new Date(request.createdAt).toLocaleDateString()}
      </p>
    </div>
  );

  if (currentUser?.role === 'employee') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Requests</h1>
        <p className="text-gray-600 dark:text-gray-400">Review and manage leave requests</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="text-sm">
            Pending ({pendingRequests?.requests.length || 0})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-sm">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!pendingRequests?.requests.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.requests.map((request) => (
                    <RequestCard key={request.id} request={request} showActions={true} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">All Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!allRequests?.requests.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allRequests.requests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        onSubmit={handleSubmitApproval}
        isLoading={updateStatusMutation.isPending}
        action={approvalAction}
        request={selectedRequest}
      />
    </div>
  );
}
