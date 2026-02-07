import React, { useState, useEffect } from 'react';
import { getEmployees, createEmployee, formatCurrency, formatDate } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Users, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PayrollPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    salary: '',
    start_date: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email || !newEmployee.position || !newEmployee.salary) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      await createEmployee({
        ...newEmployee,
        salary: parseFloat(newEmployee.salary),
        start_date: newEmployee.start_date ? new Date(newEmployee.start_date).toISOString() : null
      });
      toast.success('Employee added successfully');
      setDialogOpen(false);
      setNewEmployee({ name: '', email: '', position: '', department: '', salary: '', start_date: '' });
      loadEmployees();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.position.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayroll = employees.reduce((sum, emp) => sum + (emp.status === 'active' ? emp.salary : 0), 0);

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
          <h1 className="heading text-3xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-500 mt-1">Manage employees and salaries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-employee-btn" className="bg-orange-500 hover:bg-orange-600">
              <Plus size={16} className="mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="heading">Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Name *</Label>
                <Input
                  id="emp-name"
                  data-testid="employee-name-input"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  placeholder="Full name"
                  required
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
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Employee
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card">
          <CardContent className="stat-card">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{employees.filter(e => e.status === 'active').length}</span>
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
            <span className="stat-label">Avg. Salary</span>
            <span className="stat-value">
              {employees.length > 0 ? formatCurrency(totalPayroll / employees.filter(e => e.status === 'active').length) : formatCurrency(0)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              data-testid="search-employees"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card className="card">
        <CardContent className="p-0">
          {filteredEmployees.length === 0 ? (
            <div className="empty-state py-16">
              <Users size={48} className="text-slate-300" strokeWidth={1} />
              <h3 className="font-medium text-slate-900 mt-4">No employees found</h3>
              <p className="text-sm mt-1">Add your first employee to get started</p>
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
                    <td className="text-slate-500">{employee.department || '-'}</td>
                    <td className="text-slate-500">{formatDate(employee.start_date)}</td>
                    <td><span className={`status-badge ${employee.status}`}>{employee.status}</span></td>
                    <td className="text-right font-mono font-medium">{formatCurrency(employee.salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
