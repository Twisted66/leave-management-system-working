import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import backend from '~backend/client';
import { useUser } from '../contexts/UserContext';

export default function Dashboard() {
  const { currentUser } = useUser();

  const { data: balances } = useQuery({
    queryKey: ['balances', currentUser?.id],
    queryFn: () => currentUser ? backend.leave.getEmployeeBalances({ employeeId: currentUser.id }) : null,
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {currentUser?.name}</p>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances?.balances.map((balance) => (
          <Card key={balance.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{balance.leaveTypeName}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.availableDays}</div>
              <p className="text-xs text-muted-foreground">
                {balance.usedDays} used of {balance.allocatedDays} allocated
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myRequests?.requests.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myRequests?.requests.filter(r => r.status === 'approved').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        {(currentUser?.role === 'manager' || currentUser?.role === 'hr') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <XCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Requires action</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No leave requests yet</p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{request.leaveTypeName}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
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
          <Card>
            <CardHeader>
              <CardTitle>Pending by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingSummary.byDepartment.map((dept) => (
                  <div key={dept.department} className="flex justify-between">
                    <span>{dept.department}</span>
                    <span className="font-medium">{dept.pendingCount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending by Leave Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingSummary.byLeaveType.map((type) => (
                  <div key={type.leaveTypeName} className="flex justify-between">
                    <span>{type.leaveTypeName}</span>
                    <span className="font-medium">{type.pendingCount}</span>
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
