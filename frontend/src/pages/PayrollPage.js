import React, { useState, useEffect } from 'react';
import { getEmployees, createEmployee, getPayrollRuns, createPayrollRun, updatePayrollRunStatus, formatCurrency, formatDate } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Users, Search, Loader2, Calendar, DollarSign, CheckCircle, Play } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

export default function PayrollPage() {
  const [employees, setEmployees] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('employees');
  
  // Employee dialog
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    salary: '',
    start_date: ''
  });

  // Payroll run dialog
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [creatingRun, setCreatingRun] = useState(false);
  const [newRun, setNewRun] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [empData, runData] = await Promise.all([
        getEmployees(),
        getPayrollRuns()
      ]);
      setEmployees(empData);
      setPayrollRuns(runData);
    } catch (error) {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email || !newEmployee.position || !newEmployee.salary) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreatingEmployee(true);
    try {
      await createEmployee({
        ...newEmployee,
        salary: parseFloat(newEmployee.salary),
        start_date: newEmployee.start_date ? new Date(newEmployee.start_date).toISOString() : null
      });
      toast.success('Employee added successfully');
      setEmployeeDialogOpen(false);
      setNewEmployee({ name: '', email: '', position: '', department: '', salary: '', start_date: '' });
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreatingEmployee(false);
    }
  };

  const handleCreateRun = async (e) => {
    e.preventDefault();
    setCreatingRun(true);
    try {
      await createPayrollRun(newRun);
      toast.success('Payroll run created successfully');
      setRunDialogOpen(false);
      setNewRun({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '' });
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreatingRun(false);
    }
  };

  const handleProcessRun = async (runId, currentStatus) => {
    const nextStatus = currentStatus === 'draft' ? 'processed' : 'paid';
    try {
      await updatePayrollRunStatus(runId, nextStatus);
      toast.success(`Payroll run marked as ${nextStatus}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update payroll run');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.position.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayroll = employees.reduce((sum, emp) => sum + (emp.status === 'active' ? emp.salary : 0), 0);
  const activeEmployees = employees.filter(e => e.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading text-3xl font-bold">Payroll</h1>
          <p className="text-slate-400 mt-1">Manage employees and payroll runs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card">
          <CardContent className="stat-card">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{activeEmployees}</span>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="stat-card">
            <span className="stat-label">Monthly Payroll</span>
            <span className="stat-value">{formatCurrency(totalPayroll)}</span>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="stat-card">
            <span className="stat-label">Payroll Runs</span>
            <span className="stat-value">{payrollRuns.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="employees" data-testid="tab-employees" className="data-[state=active]:bg-orange-500">
            <Users size={16} className="mr-2" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="runs" data-testid="tab-runs" className="data-[state=active]:bg-orange-500">
            <Calendar size={16} className="mr-2" />
            Payroll Runs
          </TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                data-testid="search-employees"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>
            <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-employee-btn" className="bg-orange-500 hover:bg-orange-600">
                  <Plus size={16} className="mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="heading">Add New Employee</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emp-name">Name *</Label>
                    <Input
                      id="emp-name"
                      data-testid="employee-name-input"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                      placeholder="Full name"
                      required
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-email">Email *</Label>
                    <Input
                      id="emp-email"
                      data-testid="employee-email-input"
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      placeholder="employee@company.com"
                      required
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-position">Position *</Label>
                    <Input
                      id="emp-position"
                      data-testid="employee-position-input"
                      value={newEmployee.position}
                      onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                      placeholder="Job title"
                      required
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-department">Department</Label>
                    <Input
                      id="emp-department"
                      data-testid="employee-department-input"
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                      placeholder="e.g. Engineering, Sales"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-salary">Monthly Salary (NOK) *</Label>
                    <Input
                      id="emp-salary"
                      data-testid="employee-salary-input"
                      type="number"
                      min="0"
                      value={newEmployee.salary}
                      onChange={(e) => setNewEmployee({...newEmployee, salary: e.target.value})}
                      placeholder="50000"
                      required
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-start">Start Date</Label>
                    <Input
                      id="emp-start"
                      data-testid="employee-start-input"
                      type="date"
                      value={newEmployee.start_date}
                      onChange={(e) => setNewEmployee({...newEmployee, start_date: e.target.value})}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEmployeeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creatingEmployee}>
                      {creatingEmployee ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add Employee
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="card">
            <CardContent className="p-0">
              {filteredEmployees.length === 0 ? (
                <div className="empty-state py-16">
                  <Users size={48} className="text-slate-600" strokeWidth={1} />
                  <h3 className="font-medium mt-4">No employees found</h3>
                  <p className="text-sm mt-1 text-slate-500">Add your first employee to get started</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Start Date</th>
                      <th>Status</th>
                      <th className="text-right">Monthly Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.employee_id} data-testid={`employee-row-${employee.employee_id}`}>
                        <td>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-slate-500">{employee.email}</p>
                          </div>
                        </td>
                        <td>{employee.position}</td>
                        <td className="text-slate-400">{employee.department || '-'}</td>
                        <td className="text-slate-400">{formatDate(employee.start_date)}</td>
                        <td><span className={`status-badge ${employee.status}`}>{employee.status}</span></td>
                        <td className="text-right font-mono font-medium">{formatCurrency(employee.salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Runs Tab */}
        <TabsContent value="runs" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-payroll-run-btn" className="bg-orange-500 hover:bg-orange-600">
                  <Plus size={16} className="mr-2" />
                  Create Payroll Run
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="heading">Create Payroll Run</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRun} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Select
                        value={newRun.month.toString()}
                        onValueChange={(value) => setNewRun({...newRun, month: parseInt(value)})}
                      >
                        <SelectTrigger data-testid="run-month-select" className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => (
                            <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="run-year">Year</Label>
                      <Input
                        id="run-year"
                        data-testid="run-year-input"
                        type="number"
                        min="2020"
                        max="2100"
                        value={newRun.year}
                        onChange={(e) => setNewRun({...newRun, year: parseInt(e.target.value)})}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="run-notes">Notes</Label>
                    <Input
                      id="run-notes"
                      data-testid="run-notes-input"
                      value={newRun.notes}
                      onChange={(e) => setNewRun({...newRun, notes: e.target.value})}
                      placeholder="Optional notes"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setRunDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creatingRun}>
                      {creatingRun ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Run
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {payrollRuns.length === 0 ? (
            <Card className="card">
              <CardContent>
                <div className="empty-state py-16">
                  <Calendar size={48} className="text-slate-600" strokeWidth={1} />
                  <h3 className="font-medium mt-4">No payroll runs yet</h3>
                  <p className="text-sm mt-1 text-slate-500">Create your first payroll run</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {payrollRuns.map((run) => (
                <Card key={run.run_id} className="card" data-testid={`payroll-run-${run.run_id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Calendar className="text-blue-400" size={24} />
                        </div>
                        <div>
                          <CardTitle className="heading text-lg">
                            {MONTHS.find(m => m.value === run.month)?.label} {run.year}
                          </CardTitle>
                          <p className="text-sm text-slate-400">{run.employees.length} employees</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`status-badge ${run.status}`}>{run.status}</span>
                        {run.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessRun(run.run_id, run.status)}
                            className={run.status === 'draft' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}
                          >
                            {run.status === 'draft' ? (
                              <>
                                <Play size={14} className="mr-1" />
                                Process
                              </>
                            ) : (
                              <>
                                <CheckCircle size={14} className="mr-1" />
                                Mark Paid
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4 pt-2 border-t border-slate-700">
                      <div className="flex items-center gap-2 text-slate-400">
                        <DollarSign size={16} />
                        <span className="text-sm">Total Amount</span>
                      </div>
                      <span className="heading text-xl font-bold text-orange-400">
                        {formatCurrency(run.total_amount)}
                      </span>
                    </div>
                    
                    {/* Employee breakdown */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {run.employees.map((emp, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{emp.name}</p>
                            <p className="text-xs text-slate-500">{emp.position}</p>
                          </div>
                          <span className="font-mono text-sm">{formatCurrency(emp.net_pay)}</span>
                        </div>
                      ))}
                    </div>
                    
                    {run.notes && (
                      <p className="mt-4 text-sm text-slate-400 italic">Note: {run.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
