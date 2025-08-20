import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import backend from '~backend/client';
import { useUser } from '../contexts/UserContext';
import CreateLeaveRequestDialog from '../components/CreateLeaveRequestDialog';
import { useToast } from '@/components/ui/use-toast';

export default function MyRequests() {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-requests', currentUser?.id],
    queryFn: () => currentUser ? backend.leave.listLeaveRequests({ employeeId: currentUser.id }) : null,
    enabled: !!currentUser,
  });

  const { data: balances } = useQuery({
    queryKey: ['balances', currentUser?.id],
    queryFn: () => currentUser ? backend.leave.getEmployeeBalances({ employeeId: currentUser.id }) : null,
    enabled: !!currentUser,
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => backend.leave.listLeaveTypes(),
  });

  const createRequestMutation = useMutation({
    mutationFn: backend.leave.createLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      setShowCreateDialog(false);
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to create leave request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit leave request',
        variant: 'destructive',
      });
    },
  });

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

  if (isLoading) {
    return <div className="text-gray-900 dark:text-white">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Leave Requests</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage your leave requests</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Leave Balances Summary */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Leave Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {balances?.balances.map((balance) => (
              <div key={balance.id} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">{balance.leaveTypeName}</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{balance.availableDays}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {balance.usedDays} used / {balance.allocatedDays} allocated
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {!requests?.requests.length ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No leave requests found</p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
                variant="outline"
              >
                Create your first request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.requests.map((request) => (
                <div key={request.id} className="border dark:border-gray-600 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{request.leaveTypeName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{request.daysRequested} days</p>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(request.status)}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateLeaveRequestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => createRequestMutation.mutate(data)}
        isLoading={createRequestMutation.isPending}
        leaveTypes={leaveTypes?.leaveTypes || []}
        balances={balances?.balances || []}
        currentUser={currentUser}
      />
    </div>
  );
}
