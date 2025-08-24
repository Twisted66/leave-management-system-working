import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Plus } from 'lucide-react';
import backend from '../lib/client';
import { useUser } from '../contexts/UserContext';
import ApprovalDialog from '../components/ApprovalDialog';
import AbsenceConversionApprovalDialog from '../components/AbsenceConversionApprovalDialog';
import CreateAbsenceRecordDialog from '../components/CreateAbsenceRecordDialog';
import { useToast } from '@/components/ui/use-toast';

export default function LeaveRequests() {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedConversionRequest, setSelectedConversionRequest] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showConversionApprovalDialog, setShowConversionApprovalDialog] = useState(false);
  const [showCreateAbsenceDialog, setShowCreateAbsenceDialog] = useState(false);
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

  const { data: pendingConversionRequests } = useQuery({
    queryKey: ['pending-conversion-requests', currentUser?.id],
    queryFn: () => {
      if (currentUser?.role === 'manager') {
        return backend.leave.listAbsenceConversionRequests({ managerId: currentUser.id, status: 'pending' });
      } else if (currentUser?.role === 'hr') {
        return backend.leave.listAbsenceConversionRequests({ status: 'pending' });
      }
      return null;
    },
    enabled: !!currentUser && (currentUser.role === 'manager' || currentUser.role === 'hr'),
  });

  const { data: allConversionRequests } = useQuery({
    queryKey: ['all-conversion-requests', currentUser?.id],
    queryFn: () => {
      if (currentUser?.role === 'manager') {
        return backend.leave.listAbsenceConversionRequests({ managerId: currentUser.id });
      } else if (currentUser?.role === 'hr') {
        return backend.leave.listAbsenceConversionRequests({});
      }
      return null;
    },
    enabled: !!currentUser && (currentUser.role === 'manager' || currentUser.role === 'hr'),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => backend.leave.listEmployees(),
    enabled: currentUser?.role === 'hr',
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: number; status: 'approved' | 'rejected'; managerComments?: string; approvedBy: number }) =>
      backend.leave.updateLeaveRequestStatus(data.id, {
        status: data.status,
        managerComments: data.managerComments,
        approvedBy: data.approvedBy
      }),
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

  const updateConversionStatusMutation = useMutation({
    mutationFn: (data: { id: number; status: 'approved' | 'rejected'; managerComments?: string; approvedBy: number }) =>
      backend.leave.updateAbsenceConversionStatus(data.id, {
        status: data.status,
        managerComments: data.managerComments,
        approvedBy: data.approvedBy
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-conversion-requests'] });
      setShowConversionApprovalDialog(false);
      setSelectedConversionRequest(null);
      toast({
        title: 'Success',
        description: `Absence conversion request ${approvalAction} successfully`,
      });
    },
    onError: (error) => {
      console.error('Failed to update absence conversion request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update absence conversion request',
        variant: 'destructive',
      });
    },
  });

  const createAbsenceRecordMutation = useMutation({
    mutationFn: backend.leave.createAbsenceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-records'] });
      setShowCreateAbsenceDialog(false);
      toast({
        title: 'Success',
        description: 'Absence record created successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to create absence record:', error);
      toast({
        title: 'Error',
        description: 'Failed to create absence record',
        variant: 'destructive',
      });
    },
  });

  const handleApproval = (request: any, action: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  const handleConversionApproval = (request: any, action: 'approved' | 'rejected') => {
    setSelectedConversionRequest(request);
    setApprovalAction(action);
    setShowConversionApprovalDialog(true);
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

  const handleSubmitConversionApproval = (comments: string) => {
    if (!selectedConversionRequest || !currentUser) return;

    updateConversionStatusMutation.mutate({
      id: selectedConversionRequest.id,
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

  const ConversionRequestCard = ({ request, showActions = false }: { request: any; showActions?: boolean }) => (
    <div key={request.id} className="border dark:border-gray-600 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{request.employeeName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Absence on {new Date(request.absenceDate).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            <strong>Justification:</strong> {request.justification}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusBadge(request.status)}
          {showActions && request.status === 'pending' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConversionApproval(request, 'approved')}
                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConversionApproval(request, 'rejected')}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Requests</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and manage leave requests</p>
        </div>
        {currentUser?.role === 'hr' && (
          <Button onClick={() => setShowCreateAbsenceDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Record Absence
          </Button>
        )}
      </div>

      <Tabs defaultValue="pending-leave" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending-leave" className="text-sm">
            Pending Leave ({pendingRequests?.requests.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending-conversion" className="text-sm">
            Pending Conversion ({pendingConversionRequests?.requests.length || 0})
          </TabsTrigger>
          <TabsTrigger value="all-leave" className="text-sm">All Leave</TabsTrigger>
          <TabsTrigger value="all-conversion" className="text-sm">All Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="pending-leave">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Pending Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!pendingRequests?.requests.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No pending leave requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.requests.map((request: any) => (
                    <RequestCard key={request.id} request={request} showActions={true} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-conversion">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Pending Absence Conversion Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!pendingConversionRequests?.requests.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No pending conversion requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingConversionRequests.requests.map((request: any) => (
                    <ConversionRequestCard key={request.id} request={request} showActions={true} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-leave">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">All Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!allRequests?.requests.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No leave requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allRequests.requests.map((request: any) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-conversion">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">All Absence Conversion Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!allConversionRequests?.requests.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No conversion requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allConversionRequests.requests.map((request: any) => (
                    <ConversionRequestCard key={request.id} request={request} />
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

      <AbsenceConversionApprovalDialog
        open={showConversionApprovalDialog}
        onOpenChange={setShowConversionApprovalDialog}
        onSubmit={handleSubmitConversionApproval}
        isLoading={updateConversionStatusMutation.isPending}
        action={approvalAction}
        request={selectedConversionRequest}
      />

      <CreateAbsenceRecordDialog
        open={showCreateAbsenceDialog}
        onOpenChange={setShowCreateAbsenceDialog}
        onSubmit={(data) => createAbsenceRecordMutation.mutate(data)}
        isLoading={createAbsenceRecordMutation.isPending}
        employees={employees?.employees.filter((e: any) => e.role !== 'hr') || []}
      />
    </div>
  );
}