import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useBackend } from '../hooks/useBackend';

export default function Dashboard() {
  const { currentUser } = useUser();
  const backend = useBackend();

  const { data: balances } = useQuery({
    queryKey: ['balances', currentUser?.id],
    queryFn: () => currentUser ? backend.leave.getEmployeeBalances(currentUser.id) : null,
    enabled: !!currentUser,
  });

  const { data: myRequests } = useQuery({
    queryKey: ['my-requests', currentUser?.id],
    queryFn: () => currentUser ? backend.leave.listLeaveRequests({ employeeId: currentUser.id }) : null,
    enabled: !!currentUser,
  });

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

  const { data: pendingSummary } = useQuery({
    queryKey: ['pending-summary'],
    queryFn: () => backend.leave.getPendingRequestsSummary(),
    enabled: currentUser?.role === 'hr',
  });

  const recentRequests = myRequests?.requests.slice(0, 5) || [];
  const pendingCount = pendingRequests?.requests.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Welcome back, {currentUser?.name}</p>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances?.balances.map((balance: any) => (
          <Card key={balance.id} className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">
                {balance.leaveTypeName}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{balance.availableDays}</div>
              <p className="text-xs text-muted-foreground">
                {balance.usedDays} used of {balance.allocatedDays} allocated
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{myRequests?.requests.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {myRequests?.requests.filter((r: any) => r.status === 'approved').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        {(currentUser?.role === 'manager' || currentUser?.role === 'hr') && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Pending Approval</CardTitle>
              <XCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Requires action</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Requests */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Recent Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No leave requests yet</p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request: any) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{request.leaveTypeName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                    request.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    request.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* HR Summary */}
      {currentUser?.role === 'hr' && pendingSummary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Pending by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingSummary.byDepartment.map((dept: any) => (
                  <div key={dept.department} className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white truncate pr-2">{dept.department}</span>
                    <span className="font-medium text-gray-900 dark:text-white flex-shrink-0">{dept.pendingCount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Pending by Leave Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingSummary.byLeaveType.map((type: any) => (
                  <div key={type.leaveTypeName} className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white truncate pr-2">{type.leaveTypeName}</span>
                    <span className="font-medium text-gray-900 dark:text-white flex-shrink-0">{type.pendingCount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}