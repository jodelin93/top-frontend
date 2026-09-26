import apiClient from './client';

// Mirrors top-backend/src/employees

export type EmployeeStatus = 'active' | 'inactive';

export interface EmployeeBranch {
  branchId: string;
  isPrimary: boolean;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  employeeCode: string | null;
  status: EmployeeStatus;
  hireDate: string | null;
  terminationDate: string | null;
  notes: string | null;
  // Linked login (a member of the store), if any
  userId: string | null;
  user: { id: string; email: string; name: string } | null;
  branches: EmployeeBranch[];
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  employeeCode?: string | null;
  hireDate?: string | null;
  notes?: string | null;
  branches?: { branchId: string; isPrimary?: boolean }[];
}

export interface Attendance {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  branchId: string | null;
  source: 'pos' | 'admin';
  note: string | null;
}

export interface AttendanceReport {
  from: string;
  to: string;
  totalHours: number;
  employees: {
    employeeId: string;
    name: string;
    employeeCode: string | null;
    hours: number;
    shifts: number;
    open: boolean;
    records: (Attendance & { hours: number })[];
  }[];
}

export interface MyAttendance {
  employee: { id: string; name: string; status: EmployeeStatus } | null;
  open: Attendance | null;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
}

export const employeesApi = {
  list: async (params?: {
    status?: EmployeeStatus;
    branchId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<Employee>> => {
    const { data } = await apiClient.get('/employees', { params });
    return data;
  },
  get: async (id: string): Promise<Employee> => {
    const { data } = await apiClient.get(`/employees/${id}`);
    return data;
  },
  create: async (input: EmployeeInput & { userId?: string }): Promise<Employee> => {
    const { data } = await apiClient.post('/employees', input);
    return data;
  },
  update: async (id: string, input: Partial<EmployeeInput>): Promise<Employee> => {
    const { data } = await apiClient.patch(`/employees/${id}`, input);
    return data;
  },
  setBranches: async (id: string, branches: { branchId: string; isPrimary?: boolean }[]): Promise<Employee> => {
    const { data } = await apiClient.put(`/employees/${id}/branches`, { branches });
    return data;
  },
  linkUser: async (id: string, userId: string): Promise<Employee> => {
    const { data } = await apiClient.post(`/employees/${id}/link-user`, { userId });
    return data;
  },
  unlinkUser: async (id: string): Promise<Employee> => {
    const { data } = await apiClient.post(`/employees/${id}/unlink-user`);
    return data;
  },
  deactivate: async (id: string, input: { terminationDate?: string; reason?: string }): Promise<Employee> => {
    const { data } = await apiClient.post(`/employees/${id}/deactivate`, input);
    return data;
  },
  reactivate: async (id: string): Promise<Employee> => {
    const { data } = await apiClient.post(`/employees/${id}/reactivate`);
    return data;
  },
  recordAttendance: async (
    id: string,
    input: { clockIn: string; clockOut?: string; branchId?: string; note: string }
  ): Promise<Attendance> => {
    const { data } = await apiClient.post(`/employees/${id}/attendance`, input);
    return data;
  },
  closeAttendance: async (attendanceId: string, input: { clockOut: string; note?: string }): Promise<Attendance> => {
    const { data } = await apiClient.post(`/employees/attendance/${attendanceId}/close`, input);
    return data;
  },
  attendanceReport: async (params: {
    from: string;
    to: string;
    employeeId?: string;
    branchId?: string;
  }): Promise<AttendanceReport> => {
    const { data } = await apiClient.get('/employees/attendance', { params });
    return data;
  },
  // POS: the signed-in user's own employee
  myAttendance: async (): Promise<MyAttendance> => {
    const { data } = await apiClient.get('/employees/me/attendance');
    return data;
  },
  clock: async (input: { action: 'in' | 'out'; branchId?: string; note?: string }): Promise<Attendance> => {
    const { data } = await apiClient.post('/employees/me/clock', input);
    return data;
  },
};

/** Hours shown as 7 h 30 */
export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}
