import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle } from 'lucide-react';
import backend from '../lib/client';
import { useUser } from '../contexts/UserContext';
import CreateLeaveRequestDialog from '../components/CreateLeaveRequestDialog';
import CreateAbsenceConversionDialog from '../components/CreateAbsenceConversionDialog';
import { useToast } from '@/components/ui/use-toast';

export default function MyRequests() {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAbsenceConversionDialog, setShowAbsenceConversionDialog] = useState(false);

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

  const { data: absenceRecords } = useQuery({
    queryKey: ['absence-records', currentUser?.id],
    queryFn: () => currentUser ? backend.leave.listAbsenceRecords({ employeeId: currentUser.id }) : null,
    enabled: !!currentUser,
  });

  const { data: absenceConversionRequests } = useQuery({
    queryKey: ['absence-conversion-requests', currentUser?.id],
    queryFn: () => currentUser ? backend.leave.listAbsenceConversionRequests({ employeeId: currentUser.id }) : null,
    enabled: !!currentUser,
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

  const createAbsenceConversionMutation = useMutation({
    mutationFn: backend.leave.createAbsenceConversionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-conversion-requests'] });
      setShowAbsenceConversionDialog(false);
      toast({
        title: 'Success',
        description: 'Absence conversion request submitted successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to create absence conversion request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit absence conversion request',
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

  const pendingAbsences = absenceRecords?.records.filter(record => 
    record.status === 'pending' && 
    !absenceConversionRequests?.requests.some(req => req.absenceRecordId === record.id)
  ) || [];

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

      {/* Pending Absences Alert */}
      {pendingAbsences.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-5 w-5" />
              Unauthorized Absences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 dark:text-orange-300 mb-4">
              You have {pendingAbsences.length} unauthorized absence(s) that need to be addressed. 
              You can request to convert them to annual leave deductions.
            </p>
            <Button 
              onClick={() => setShowAbsenceConversionDialog(true)}
              variant="outline"
              className="border-orange-300 text-orange-800 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-200 dark:hover:bg-orange-800/20"
            >
              Request Conversion
            </Button>
          </CardContent>
        </Card>
      )}

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

      <Tabs defaultValue="leave-requests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leave-requests" className="text-sm">Leave Requests</TabsTrigger>
          <TabsTrigger value="absence-records" className="text-sm">Absence Records</TabsTrigger>
          <TabsTrigger value="conversion-requests" className="text-sm">Conversion Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="leave-requests">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Leave Request History</CardTitle>
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
        </TabsContent>

        <TabsContent value="absence-records">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Absence Records</CardTitle>
            </CardHeader>
            <CardContent>
              {!absenceRecords?.records.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No absence records found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {absenceRecords.records.map((record) => (
                    <div key={record.id} className="border dark:border-gray-600 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Absence on {new Date(record.absenceDate).toLocaleDateString()}
                          </h3>
                          {record.reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{record.reason}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Recorded by {record.createdByName} on {new Date(record.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion-requests">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Absence Conversion Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!absenceConversionRequests?.requests.length ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No conversion requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {absenceConversionRequests.requests.map((request) => (
                    <div key={request.id} className="border dark:border-gray-600 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Conversion for {new Date(request.absenceDate!).toLocaleDateString()}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <strong>Justification:</strong> {request.justification}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Submitted on {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(request.status)}
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateLeaveRequestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => createRequestMutation.mutate(data)}
        isLoading={createRequestMutation.isPending}
        leaveTypes={leaveTypes?.leaveTypes || []}
        balances={balances?.balances || []}
        currentUser={currentUser}
      />

      <CreateAbsenceConversionDialog
        open={showAbsenceConversionDialog}
        onOpenChange={setShowAbsenceConversionDialog}
        onSubmit={(data) => createAbsenceConversionMutation.mutate(data)}
        isLoading={createAbsenceConversionMutation.isPending}
        absenceRecords={pendingAbsences}
      />
    </div>
  );
}
