export type Role = "institution" | "ro" | "grievance" | "vigilance" | "finance"

export type CourseCategory = "Engineering" | "Management" | "Pharmacy" | "Polytechnic"
export type TrustCategory = "General" | "Minority"
export type PremisesStatus = "Owned Land" | "Leased Building"
export type SubmissionMode = "Joint FDR Bond" | "Electronic Deposit"

export type Stage =
  | "Submitted"
  | "Deficiency Raised"
  | "Vaulted"
  | "Release Requested"
  | "Released"
  | "Forfeited"

export type NocStatus = "Not Initiated" | "Pending" | "Cleared" | "On Hold" | "Forfeiture Recommended"

export type Bureau = "approval" | "grievance" | "vigilance"

export interface Noc {
  status: NocStatus
  officer?: string
  remark?: string
  at?: string
}

export interface CourtCase {
  caseNo: string
  forum: string
  nature: string
  status: "Pending" | "Disposed"
}

export interface NoteSheetEntry {
  id: string
  role: Role
  officer: string
  designation: string
  remark: string
  at: string
}

export interface ReleaseOrder {
  omNo: string
  signedAt: string
  dscSerial: string
  signatory: string
  hash: string
}

export interface FdrRecord {
  id: string
  fileNo: string
  institutionId: string
  institutionName: string
  trustName: string
  city: string
  state: string
  region: string
  course: CourseCategory
  trustCategory: TrustCategory
  premises: PremisesStatus
  requiredAmount: number
  mode: SubmissionMode
  bankName: string
  branch: string
  fdrNo: string
  issueDate: string
  maturityDate: string
  principal: number
  lienStatus: string
  utrNo?: string
  scanUrl?: string
  scanName?: string
  ocrConfidence?: number
  tamperCheck: "Passed" | "Flagged" | "Not Run"
  stage: Stage
  eoa: { lastEoaYear: string; continuous: boolean; academicCompliance: boolean; intakeVariance: string }
  grievance: { facultySalary: number; feeRefund: number; ombudsman: number }
  legal: { cases: CourtCase[]; investigations: number; severity: "None" | "Minor" | "Severe" }
  noc: Record<Bureau, Noc>
  noteSheet: NoteSheetEntry[]
  releaseOrder?: ReleaseOrder
  submittedAt: string
}

export interface AuditEntry {
  seq: number
  at: string
  role: Role
  officer: string
  action: string
  fileNo: string
  details: string
  prevHash: string
  hash: string
}

export interface AlertDispatch {
  id: string
  at: string
  fileNo: string
  institutionName: string
  window: "T-90" | "T-60" | "T-30" | "Matured"
  channel: "SMS" | "Email"
  recipient: string
  status: "Delivered" | "Queued"
}
