export type ConsoleRole =
  | "Admin / CEO"
  | "Operations Manager"
  | "Audit Officer"
  | "Staff / Case Worker"
  | "Viewer";
export type ServiceType = "OCI" | "Passport Renewal" | "E-Visa";
export type PaymentStatus = "Paid" | "Pending" | "Prepaid";
export type StaffLoadStatus = "Available" | "Busy" | "Overloaded";

export type KanbanStage =
  | "NEW_LEAD"
  | "AUDIT_PENDING"
  | "AUDIT_COMPLETED"
  | "DOCUMENTS_REQUIRED"
  | "PAYMENT_PENDING"
  | "DOCUMENT_UPLOAD_PENDING"
  | "FORM_FILLING"
  | "REVIEW_PENDING"
  | "READY_FOR_SUBMISSION"
  | "SUBMITTED"
  | "DELIVERED";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  assigned: number;
  completed: number;
  pending: number;
  avgTime: string;
  slaBreach: number;
  accuracy: number;
  auditsPassed: number;
  auditsFailed: number;
  loadStatus: StaffLoadStatus;
}

export interface PipelineCase {
  id: string;
  customer: string;
  serviceType: ServiceType;
  country: string;
  flag: string;
  amount: number;
  paymentStatus: PaymentStatus;
  stage: KanbanStage;
  assignedTo: string | null;
  slaTimer: string;
  slaBreached: boolean;
}

export const FLYOCI_ROLES: ConsoleRole[] = [
  "Admin / CEO",
  "Operations Manager",
  "Audit Officer",
  "Staff / Case Worker",
  "Viewer",
];

export const KANBAN_COLUMNS: { id: KanbanStage; title: string; color: string }[] = [
  { id: "NEW_LEAD", title: "NEW LEAD", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { id: "AUDIT_PENDING", title: "AUDIT PENDING", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { id: "AUDIT_COMPLETED", title: "AUDIT COMPLETED", color: "bg-green-100 text-green-700 border-green-200" },
  { id: "DOCUMENTS_REQUIRED", title: "DOCUMENTS REQUIRED", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "PAYMENT_PENDING", title: "PAYMENT PENDING", color: "bg-red-100 text-red-700 border-red-200" },
  {
    id: "DOCUMENT_UPLOAD_PENDING",
    title: "DOCUMENT UPLOAD PENDING",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  { id: "FORM_FILLING", title: "FORM FILLING", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "REVIEW_PENDING", title: "REVIEW PENDING", color: "bg-amber-100 text-amber-700 border-amber-200" },
  {
    id: "READY_FOR_SUBMISSION",
    title: "READY FOR SUBMISSION",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  { id: "SUBMITTED", title: "SUBMITTED", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "DELIVERED", title: "DELIVERED", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export const STAFF_MEMBERS: StaffMember[] = [
  {
    id: "s1",
    name: "Nimit",
    role: "Audit Officer",
    initials: "NI",
    assigned: 8,
    completed: 5,
    pending: 3,
    avgTime: "38 min",
    slaBreach: 1,
    accuracy: 97,
    auditsPassed: 21,
    auditsFailed: 2,
    loadStatus: "Busy",
  },
  {
    id: "s2",
    name: "Riya",
    role: "Case Worker",
    initials: "RI",
    assigned: 6,
    completed: 6,
    pending: 0,
    avgTime: "31 min",
    slaBreach: 0,
    accuracy: 99,
    auditsPassed: 18,
    auditsFailed: 0,
    loadStatus: "Available",
  },
  {
    id: "s3",
    name: "Karan",
    role: "Case Worker",
    initials: "KA",
    assigned: 10,
    completed: 4,
    pending: 6,
    avgTime: "52 min",
    slaBreach: 3,
    accuracy: 93,
    auditsPassed: 16,
    auditsFailed: 4,
    loadStatus: "Overloaded",
  },
  {
    id: "s4",
    name: "Meera",
    role: "Ops Manager",
    initials: "ME",
    assigned: 4,
    completed: 4,
    pending: 0,
    avgTime: "25 min",
    slaBreach: 0,
    accuracy: 100,
    auditsPassed: 30,
    auditsFailed: 0,
    loadStatus: "Available",
  },
];

export const PIPELINE_CASES: PipelineCase[] = [
  {
    id: "LEAD-1001",
    customer: "Devkishan Suthar",
    serviceType: "OCI",
    country: "India",
    flag: "🇮🇳",
    amount: 5000,
    paymentStatus: "Paid",
    stage: "AUDIT_PENDING",
    assignedTo: "Nimit",
    slaTimer: "01:38:00",
    slaBreached: false,
  },
  {
    id: "LEAD-1002",
    customer: "Priya Sharma",
    serviceType: "Passport Renewal",
    country: "India",
    flag: "🇮🇳",
    amount: 3500,
    paymentStatus: "Pending",
    stage: "DOCUMENTS_REQUIRED",
    assignedTo: "Riya",
    slaTimer: "00:44:00",
    slaBreached: false,
  },
  {
    id: "LEAD-1003",
    customer: "Arjun Mehta",
    serviceType: "E-Visa",
    country: "USA",
    flag: "🇺🇸",
    amount: 8000,
    paymentStatus: "Paid",
    stage: "FORM_FILLING",
    assignedTo: "Karan",
    slaTimer: "00:10:00",
    slaBreached: false,
  },
  {
    id: "LEAD-1004",
    customer: "Sunita Patel",
    serviceType: "OCI",
    country: "UK",
    flag: "🇬🇧",
    amount: 12000,
    paymentStatus: "Paid",
    stage: "REVIEW_PENDING",
    assignedTo: "Nimit",
    slaTimer: "-00:25:00",
    slaBreached: true,
  },
  {
    id: "LEAD-1005",
    customer: "Rahul Gupta",
    serviceType: "OCI",
    country: "Canada",
    flag: "🇨🇦",
    amount: 6500,
    paymentStatus: "Pending",
    stage: "NEW_LEAD",
    assignedTo: null,
    slaTimer: "02:18:00",
    slaBreached: false,
  },
];

export const KPI_SNAPSHOT = {
  totalLeads: 47,
  converted: 31,
  conversion: "66%",
  revenueToday: 28500,
  pendingPayments: 14000,
};

export const DAILY_REVENUE = [
  { day: "Mon", actual: 22000, expected: 25000 },
  { day: "Tue", actual: 31000, expected: 28000 },
  { day: "Wed", actual: 28000, expected: 30000 },
  { day: "Thu", actual: 36000, expected: 35000 },
  { day: "Fri", actual: 42000, expected: 40000 },
  { day: "Sat", actual: 18000, expected: 22000 },
  { day: "Sun", actual: 16000, expected: 20000 },
];

export const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 490000 },
  { month: "Feb", revenue: 530000 },
  { month: "Mar", revenue: 565000 },
  { month: "Apr", revenue: 592000 },
  { month: "May", revenue: 631000 },
  { month: "Jun", revenue: 658000 },
];

export const SERVICE_REVENUE_BREAKDOWN = [
  { name: "OCI", value: 48 },
  { name: "Passport", value: 25 },
  { name: "E-Visa", value: 19 },
  { name: "Add-ons", value: 8 },
];

export const ALERT_FEED = [
  { id: "al-1", severity: "critical", text: "Pending audit > 4 hours", entity: "LEAD-1001" },
  { id: "al-2", severity: "critical", text: "Pending submission > 24 hours", entity: "LEAD-1004" },
  { id: "al-3", severity: "warning", text: "Customer requires follow-up", entity: "Priya Sharma" },
  { id: "al-4", severity: "critical", text: "SLA breach - Karan - LEAD-1003", entity: "Karan" },
  { id: "al-5", severity: "critical", text: "Payment failure", entity: "Rahul Gupta" },
  { id: "al-6", severity: "warning", text: "Staff idle > 30 minutes", entity: "Riya" },
  { id: "al-7", severity: "info", text: "High priority case flagged", entity: "LEAD-1002" },
];

export const ACCESS_LOGS = [
  { staff: "Nimit", file: "PASSPORT_DevkishanSuthar_2026.pdf", time: "10:42 AM" },
  { staff: "Riya", file: "ADDRESS_Proof_PriyaSharma.pdf", time: "10:37 AM" },
  { staff: "Karan", file: "EVISA_ArjunMehta_Form.pdf", time: "10:31 AM" },
];
