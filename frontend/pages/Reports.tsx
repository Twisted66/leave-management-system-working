import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, BarChart3, Users, Calendar } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useBackend } from '../hooks/useBackend';
import ProtectedRoute from '../components/ProtectedRoute';

function ReportsContent() {
  const { currentUser } = useUser();
  const backend = useBackend();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const { data: leaveUsageReport } = useQuery({
    queryKey: ['leave-usage-report', selectedYear, selectedDepartment],
    queryFn: () => backend.leave.getLeaveUsageReport({
      year: parseInt(selectedYear),
      department: selectedDepartment || undefined,
    }),
    enabled: currentUser?.role === 'hr',
  });

  const { data: pendingSummary } = useQuery({
    queryKey: ['pending-summary'],
    queryFn: () => backend.leave.getPendingRequestsSummary(),
    enabled: currentUser?.role === 'hr',
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => backend.leave.listEmployees(),
    enabled: currentUser?.role === 'hr',
  });

  const departments = [...new Set(employees?.employees.map((e: any) => e.department) || [])];

  const exportToCSV = () => {
    if (!leaveUsageReport?.employeeReports) return;

    const headers = [
      'Employee Name',
      'Department',
      'Leave Type',
      'Allocated Days',
      'Used Days',
      'Available Days',
      'Utilization %'
    ];

    const csvContent = [
      headers.join(','),
      ...leaveUsageReport.employeeReports.map((report: any) => [
        report.employeeName,
        report.department,
        report.leaveTypeName,
        report.allocatedDays,
        report.usedDays,
        report.availableDays,
        report.utilizationPercentage
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-usage-report-${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">Leave usage analytics and insights</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectItem value="2024" className="dark:text-white">2024</SelectItem>
                  <SelectItem value="2023" className="dark:text-white">2023</SelectItem>
                  <SelectItem value="2022" className="dark:text-white">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectItem value="" className="dark:text-white">All departments</SelectItem>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept} value={dept} className="dark:text-white">{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
          <TabsTrigger value="department" className="text-sm">By Department</TabsTrigger>
          <TabsTrigger value="employee" className="text-sm">By Employee</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employees?.employees.filter((e: any) => e.role !== 'hr').length || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Pending Requests</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{pendingSummary?.totalPending || 0}</div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Avg Utilization</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {leaveUsageReport?.departmentSummaries.length ? 
                    Math.round(leaveUsageReport.departmentSummaries.reduce((acc: any, dept: any) => acc + dept.averageUtilization, 0) / leaveUsageReport.departmentSummaries.length) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Days Used</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {leaveUsageReport?.departmentSummaries.reduce((acc: any, dept: any) => acc + dept.totalUsedDays, 0) || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="department">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Department Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {!leaveUsageReport?.departmentSummaries.length ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
              ) : (
                <div className="space-y-4">
                  {leaveUsageReport.departmentSummaries.map((dept: any) => (
                    <div key={dept.department} className="border dark:border-gray-600 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{dept.department}</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{dept.totalEmployees} employees</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Allocated Days</p>
                          <p className="font-medium text-gray-900 dark:text-white">{dept.totalAllocatedDays}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Used Days</p>
                          <p className="font-medium text-gray-900 dark:text-white">{dept.totalUsedDays}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Utilization</p>
                          <p className="font-medium text-gray-900 dark:text-white">{dept.averageUtilization}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Employee Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!leaveUsageReport?.employeeReports.length ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-600">
                        <th className="text-left p-2 text-gray-900 dark:text-white">Employee</th>
                        <th className="text-left p-2 text-gray-900 dark:text-white">Department</th>
                        <th className="text-left p-2 text-gray-900 dark:text-white">Leave Type</th>
                        <th className="text-right p-2 text-gray-900 dark:text-white">Allocated</th>
                        <th className="text-right p-2 text-gray-900 dark:text-white">Used</th>
                        <th className="text-right p-2 text-gray-900 dark:text-white">Available</th>
                        <th className="text-right p-2 text-gray-900 dark:text-white">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveUsageReport.employeeReports.map((report: any, index: any) => (
                        <tr key={index} className="border-b dark:border-gray-600">
                          <td className="p-2 text-gray-900 dark:text-white">{report.employeeName}</td>
                          <td className="p-2 text-gray-600 dark:text-gray-400">{report.department}</td>
                          <td className="p-2 text-gray-600 dark:text-gray-400">{report.leaveTypeName}</td>
                          <td className="p-2 text-right text-gray-900 dark:text-white">{report.allocatedDays}</td>
                          <td className="p-2 text-right text-gray-900 dark:text-white">{report.usedDays}</td>
                          <td className="p-2 text-right text-gray-900 dark:text-white">{report.availableDays}</td>
                          <td className="p-2 text-right text-gray-900 dark:text-white">{report.utilizationPercentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Reports() {
  return (
    <ProtectedRoute requiredRole="hr">
      <ReportsContent />
    </ProtectedRoute>
  );
}