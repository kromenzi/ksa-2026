export interface MockEmployee {
  id: string;
  name: string;
  title: string;
  department: string;
  employeeId: string;
}

export const MOCK_EMPLOYEES: MockEmployee[] = [
  {
    id: "EMP-1001",
    employeeId: "EMP-1001",
    name: "Abdulkarem S. Alanzi",
    title: "Senior HSE Supervisor",
    department: "Production",
  },
  {
    id: "EMP-1002",
    employeeId: "EMP-1002",
    name: "Mohammad Hassan",
    title: "Electrical Specialist",
    department: "Maintenance",
  },
  {
    id: "EMP-1003",
    employeeId: "EMP-1003",
    name: "Sarah Johnson",
    title: "Safety Officer",
    department: "HSE",
  },
  {
    id: "EMP-1004",
    employeeId: "EMP-1004",
    name: "Tariq Mansoor",
    title: "Mechanical Technician",
    department: "Maintenance",
  },
  {
    id: "EMP-1005",
    employeeId: "EMP-1005",
    name: "Omar Nabel",
    title: "Production Operator",
    department: "Production",
  },
  {
    id: "EMP-1006",
    employeeId: "EMP-1006",
    name: "Khaled Al-Otaibi",
    title: "Quality Inspector",
    department: "Production",
  },
];
