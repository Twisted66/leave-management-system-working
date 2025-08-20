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
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leave Requests</h1>
          <p className="text-gray-600">View and manage your leave requests</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Leave Balances Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {balances?.balances.map((balance) => (
              <div key={balance.id} className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">{balance.leaveTypeName}</h3>
                <p className="text-2xl font-bold text-blue-600">{balance.availableDays}</p>
                <p className="text-sm text-gray-500">
                  {balance.usedDays} used / {balance.allocatedDays} allocated
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {!requests?.requests.length ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No leave requests found</p>
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
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{request.leaveTypeName}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">{request.daysRequested} days</p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  {request.reason && (
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Reason:</strong> {request.reason}
                    </p>
                  )}
                  
                  {request.managerComments && (
                    <div className="bg-gray-50 p-3 rounded mt-2">
                      <p className="text-sm font-medium text-gray-900">Manager Comments:</p>
                      <p className="text-sm text-gray-700">{request.managerComments}</p>
                      {request.approverName && (
                        <p className="text-xs text-gray-500 mt-1">
                          By {request.approverName} on {new Date(request.approvedAt!).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
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
