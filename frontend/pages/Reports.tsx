import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, BarChart3, Users, Calendar } from 'lucide-react';
import backend from '~backend/client';
import { useUser } from '../contexts/UserContext';

export default function Reports() {
  const { currentUser } = useUser();
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

  const departments = [...new Set(employees?.employees.map(e => e.department) || [])];

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
      ...leaveUsageReport.employeeReports.map(report => [
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

  if (currentUser?.role !== 'hr') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Leave usage analytics and insights</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="department">By Department</TabsTrigger>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {employees?.employees.filter(e => e.role !== 'hr').length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingSummary?.totalPending || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {leaveUsageReport?.departmentSummaries.length ? 
                    Math.round(leaveUsageReport.departmentSummaries.reduce((acc, dept) => acc + dept.averageUtilization, 0) / leaveUsageReport.departmentSummaries.length) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Days Used</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {leaveUsageReport?.departmentSummaries.reduce((acc, dept) => acc + dept.totalUsedDays, 0) || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="department">
          <Card>
            <CardHeader>
              <CardTitle>Department Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {!leaveUsageReport?.departmentSummaries.length ? (
                <p className="text-gray-500 text-center py-4">No data available</p>
              ) : (
                <div className="space-y-4">
                  {leaveUsageReport.departmentSummaries.map((dept) => (
                    <div key={dept.department} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{dept.department}</h3>
                        <span className="text-sm text-gray-500">{dept.totalEmployees} employees</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Allocated Days</p>
                          <p className="font-medium">{dept.totalAllocatedDays}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Used Days</p>
                          <p className="font-medium">{dept.totalUsedDays}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Utilization</p>
                          <p className="font-medium">{dept.averageUtilization}%</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Employee Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!leaveUsageReport?.employeeReports.length ? (
                <p className="text-gray-500 text-center py-4">No data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Employee</th>
                        <th className="text-left p-2">Department</th>
                        <th className="text-left p-2">Leave Type</th>
                        <th className="text-right p-2">Allocated</th>
                        <th className="text-right p-2">Used</th>
                        <th className="text-right p-2">Available</th>
                        <th className="text-right p-2">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveUsageReport.employeeReports.map((report, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{report.employeeName}</td>
                          <td className="p-2">{report.department}</td>
                          <td className="p-2">{report.leaveTypeName}</td>
                          <td className="p-2 text-right">{report.allocatedDays}</td>
                          <td className="p-2 text-right">{report.usedDays}</td>
                          <td className="p-2 text-right">{report.availableDays}</td>
                          <td className="p-2 text-right">{report.utilizationPercentage}%</td>
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
