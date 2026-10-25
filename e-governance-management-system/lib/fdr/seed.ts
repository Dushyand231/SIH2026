import type { AuditEntry, FdrRecord, NoteSheetEntry, Role } from "./types"
import { addYears, assessDeposit, isoDateOffset, LOCK_IN_YEARS, ROLE_META, sha256 } from "./utils"

export const GENESIS_HASH = "0".repeat(64)

export function computeAuditHash(entry: Omit<AuditEntry, "hash">) {
  return sha256(
    [entry.seq, entry.at, entry.role, entry.officer, entry.action, entry.fileNo, entry.details, entry.prevHash].join("|"),
  )
}

export function appendAudit(
  trail: AuditEntry[],
  e: { at: string; role: Role; officer: string; action: string; fileNo: string; details: string },
): AuditEntry[] {
  const prev = trail[trail.length - 1]
  const base = { ...e, seq: (prev?.seq ?? 0) + 1, prevHash: prev?.hash ?? GENESIS_HASH }
  return [...trail, { ...base, hash: computeAuditHash(base) }]
}

function daysAgoIso(days: number, hour = 11) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, (days * 7) % 60, (days * 13) % 60, 0)
  return d.toISOString()
}

function note(role: Role, remark: string, at: string, id: string): NoteSheetEntry {
  return { id, role, officer: ROLE_META[role].officer, designation: ROLE_META[role].designation, remark, at }
}

function maturityIn(days: number) {
  const maturityDate = isoDateOffset(days)
  return { maturityDate, issueDate: addYears(maturityDate, -LOCK_IN_YEARS) }
}

const SCAN = "/images/fdr-bond-scan.png"

export function buildSeed(): { records: FdrRecord[]; audit: AuditEntry[] } {
  const r1Dates = maturityIn(24)
  const r2Dates = maturityIn(52)
  const r3Dates = { issueDate: isoDateOffset(-6), maturityDate: addYears(isoDateOffset(-6), LOCK_IN_YEARS) }
  const r4Dates = { issueDate: isoDateOffset(-3), maturityDate: addYears(isoDateOffset(-3), LOCK_IN_YEARS) }
  const r5Dates = maturityIn(81)
  const r6Dates = maturityIn(-5)

  const records: FdrRecord[] = [
    {
      id: "r1",
      fileNo: "TECH/FDR/2026/00482",
      institutionId: "INST-SR-1-4402871",
      institutionName: "Sri Venkateswara Institute of Engineering & Technology",
      trustName: "Sri Venkateswara Educational & Charitable Trust",
      city: "Tirupati",
      state: "Andhra Pradesh",
      region: "Southern Region",
      course: "Engineering",
      trustCategory: "General",
      premises: "Owned Land",
      requiredAmount: assessDeposit("Engineering", "General", "Owned Land").total,
      mode: "Joint FDR Bond",
      bankName: "State Bank of India",
      branch: "Tirupati Main Branch (IFSC SBIN0000921)",
      fdrNo: "SBI/FDR/38291047",
      ...r1Dates,
      principal: 1500000,
      lienStatus: "Lien marked in favour of Regulatory Authority",
      scanUrl: SCAN,
      scanName: "SVIET_FDR_Bond_Scan.pdf",
      ocrConfidence: 97.4,
      tamperCheck: "Passed",
      stage: "Release Requested",
      eoa: { lastEoaYear: "2026-27", continuous: true, academicCompliance: true, intakeVariance: "Nil" },
      grievance: { facultySalary: 0, feeRefund: 0, ombudsman: 0 },
      legal: { cases: [], investigations: 0, severity: "None" },
      noc: {
        approval: {
          status: "Cleared",
          officer: ROLE_META.ro.officer,
          remark: "EoA continuous for 8 academic sessions. No adverse academic observation.",
          at: daysAgoIso(3),
        },
        grievance: { status: "Pending" },
        vigilance: { status: "Pending" },
      },
      noteSheet: [
        note("institution", "Release of matured FDR requested upon completion of 8-year lock-in period.", daysAgoIso(5), "n1"),
        note("ro", "EoA continuity and academic compliance verified. Approval Bureau NOC granted. Forwarded to GRC & VLC.", daysAgoIso(3), "n2"),
      ],
      submittedAt: daysAgoIso(2900),
    },
    {
      id: "r2",
      fileNo: "TECH/FDR/2026/00517",
      institutionId: "INST-WR-1-3920014",
      institutionName: "Al-Ameen College of Pharmacy",
      trustName: "Al-Ameen Minority Educational Society",
      city: "Pune",
      state: "Maharashtra",
      region: "Western Region",
      course: "Pharmacy",
      trustCategory: "Minority",
      premises: "Leased Building",
      requiredAmount: assessDeposit("Pharmacy", "Minority", "Leased Building").total,
      mode: "Joint FDR Bond",
      bankName: "Bank of Baroda",
      branch: "Camp Branch, Pune (IFSC BARB0PUNCAM)",
      fdrNo: "BOB/TD/77120395",
      ...r2Dates,
      principal: 1500000,
      lienStatus: "Lien marked in favour of Regulatory Authority",
      scanUrl: SCAN,
      scanName: "AlAmeen_JointFDR.jpg",
      ocrConfidence: 95.1,
      tamperCheck: "Passed",
      stage: "Release Requested",
      eoa: { lastEoaYear: "2026-27", continuous: true, academicCompliance: true, intakeVariance: "Within permissible limit" },
      grievance: { facultySalary: 0, feeRefund: 0, ombudsman: 0 },
      legal: { cases: [], investigations: 0, severity: "None" },
      noc: { approval: { status: "Pending" }, grievance: { status: "Pending" }, vigilance: { status: "Pending" } },
      noteSheet: [
        note("institution", "Advance request for release of FDR maturing within T-60 window.", daysAgoIso(1), "n3"),
      ],
      submittedAt: daysAgoIso(2870),
    },
    {
      id: "r3",
      fileNo: "TECH/FDR/2026/00603",
      institutionId: "INST-NR-1-5518230",
      institutionName: "Northern Institute of Management Studies",
      trustName: "Shivalik Knowledge Foundation",
      city: "Dehradun",
      state: "Uttarakhand",
      region: "Northern Region",
      course: "Management",
      trustCategory: "General",
      premises: "Leased Building",
      requiredAmount: assessDeposit("Management", "General", "Leased Building").total,
      mode: "Joint FDR Bond",
      bankName: "Punjab National Bank",
      branch: "Rajpur Road, Dehradun (IFSC PUNB0123400)",
      fdrNo: "PNB/FD/90214466",
      ...r3Dates,
      principal: 2000000,
      lienStatus: "Lien marked in favour of Regulatory Authority",
      scanUrl: SCAN,
      scanName: "NIMS_FDR_Affidavit.pdf",
      ocrConfidence: 93.8,
      tamperCheck: "Passed",
      stage: "Submitted",
      eoa: { lastEoaYear: "New Application", continuous: true, academicCompliance: true, intakeVariance: "N/A" },
      grievance: { facultySalary: 0, feeRefund: 0, ombudsman: 0 },
      legal: { cases: [], investigations: 0, severity: "None" },
      noc: {
        approval: { status: "Not Initiated" },
        grievance: { status: "Not Initiated" },
        vigilance: { status: "Not Initiated" },
      },
      noteSheet: [
        note("institution", "Joint FDR bond with notarised affidavit uploaded for new approval (Leased premises).", daysAgoIso(6), "n4"),
      ],
      submittedAt: daysAgoIso(6),
    },
    {
      id: "r4",
      fileNo: "TECH/FDR/2026/00611",
      institutionId: "INST-ER-1-6610457",
      institutionName: "Kalinga Polytechnic Institute",
      trustName: "Kalinga Technical Education Trust",
      city: "Bhubaneswar",
      state: "Odisha",
      region: "Eastern Region",
      course: "Polytechnic",
      trustCategory: "General",
      premises: "Owned Land",
      requiredAmount: assessDeposit("Polytechnic", "General", "Owned Land").total,
      mode: "Electronic Deposit",
      bankName: "Reserve Bank e-Kuber (RTGS)",
      branch: "Escrow Account No. 3920XXXX4471",
      fdrNo: "E-DEP/2026/611",
      ...r4Dates,
      principal: 750000,
      lienStatus: "Held in Escrow (Regulatory Authority)",
      utrNo: "SBINR52026102300418827",
      tamperCheck: "Not Run",
      stage: "Submitted",
      eoa: { lastEoaYear: "New Application", continuous: true, academicCompliance: true, intakeVariance: "N/A" },
      grievance: { facultySalary: 0, feeRefund: 0, ombudsman: 0 },
      legal: { cases: [], investigations: 0, severity: "None" },
      noc: {
        approval: { status: "Not Initiated" },
        grievance: { status: "Not Initiated" },
        vigilance: { status: "Not Initiated" },
      },
      noteSheet: [note("institution", "Security deposit remitted via RTGS. UTR furnished for verification.", daysAgoIso(3), "n5")],
      submittedAt: daysAgoIso(3),
    },
    {
      id: "r5",
      fileNo: "TECH/FDR/2026/00398",
      institutionId: "INST-CR-1-2287719",
      institutionName: "Dr. B. R. Memorial Institute of Technology",
      trustName: "Navjeevan Shiksha Prasar Samiti",
      city: "Bhopal",
      state: "Madhya Pradesh",
      region: "Central Region",
      course: "Engineering",
      trustCategory: "General",
      premises: "Leased Building",
      requiredAmount: assessDeposit("Engineering", "General", "Leased Building").total,
      mode: "Joint FDR Bond",
      bankName: "Canara Bank",
      branch: "MP Nagar, Bhopal (IFSC CNRB0002931)",
      fdrNo: "CNRB/FDR/11408823",
      ...r5Dates,
      principal: 3000000,
      lienStatus: "Lien marked in favour of Regulatory Authority",
      scanUrl: SCAN,
      scanName: "DBRMIT_FDR.pdf",
      ocrConfidence: 91.2,
      tamperCheck: "Passed",
      stage: "Release Requested",
      eoa: { lastEoaYear: "2024-25", continuous: false, academicCompliance: false, intakeVariance: "Excess admission (+18%)" },
      grievance: { facultySalary: 3, feeRefund: 7, ombudsman: 1 },
      legal: {
        cases: [
          { caseNo: "WP(C) 4471/2025", forum: "High Court of Madhya Pradesh", nature: "Unpaid faculty salaries", status: "Pending" },
          { caseNo: "CC 118/2026", forum: "District Consumer Commission, Bhopal", nature: "Fee refund – 42 students", status: "Pending" },
          { caseNo: "VIG/INQ/2025/77", forum: "Internal Vigilance Inquiry", nature: "Forged land-use certificate", status: "Pending" },
        ],
        investigations: 1,
        severity: "Severe",
      },
      noc: { approval: { status: "Pending" }, grievance: { status: "Pending" }, vigilance: { status: "Pending" } },
      noteSheet: [note("institution", "Request for release of FDR ahead of maturity.", daysAgoIso(2), "n6")],
      submittedAt: daysAgoIso(2840),
    },
    {
      id: "r6",
      fileNo: "TECH/FDR/2026/00274",
      institutionId: "INST-SR-1-1093364",
      institutionName: "St. Xavier's Institute of Engineering",
      trustName: "Xavier Educational Society (Minority)",
      city: "Kochi",
      state: "Kerala",
      region: "South-Western Region",
      course: "Engineering",
      trustCategory: "Minority",
      premises: "Owned Land",
      requiredAmount: assessDeposit("Engineering", "Minority", "Owned Land").total,
      mode: "Joint FDR Bond",
      bankName: "Indian Overseas Bank",
      branch: "Ernakulam North (IFSC IOBA0000381)",
      fdrNo: "IOB/FDR/66023117",
      ...r6Dates,
      principal: 1125000,
      lienStatus: "Lien marked in favour of Regulatory Authority",
      scanUrl: SCAN,
      scanName: "SXIE_Joint_FDR.pdf",
      ocrConfidence: 98.6,
      tamperCheck: "Passed",
      stage: "Release Requested",
      eoa: { lastEoaYear: "2026-27", continuous: true, academicCompliance: true, intakeVariance: "Nil" },
      grievance: { facultySalary: 0, feeRefund: 0, ombudsman: 0 },
      legal: { cases: [], investigations: 0, severity: "None" },
      noc: {
        approval: { status: "Cleared", officer: ROLE_META.ro.officer, remark: "EoA continuous. NOC granted.", at: daysAgoIso(9) },
        grievance: { status: "Cleared", officer: ROLE_META.grievance.officer, remark: "No pending grievance. NOC issued.", at: daysAgoIso(7) },
        vigilance: { status: "Cleared", officer: ROLE_META.vigilance.officer, remark: "No court case / inquiry. NOC granted.", at: daysAgoIso(6) },
      },
      noteSheet: [
        note("institution", "FDR matured. Release requested.", daysAgoIso(11), "n7"),
        note("ro", "EoA continuity verified. Approval Bureau NOC granted.", daysAgoIso(9), "n8"),
        note("grievance", "No pending faculty / student grievance. Grievance NOC issued.", daysAgoIso(7), "n9"),
        note("vigilance", "Registry search returned Nil. Vigilance NOC granted. Put up to Finance.", daysAgoIso(6), "n10"),
      ],
      submittedAt: daysAgoIso(2930),
    },
  ]

  let audit: AuditEntry[] = []
  const events: Array<{ at: string; role: Role; action: string; fileNo: string; details: string }> = [
    { at: daysAgoIso(11, 10), role: "institution", action: "RELEASE_REQUESTED", fileNo: "TECH/FDR/2026/00274", details: "Release request filed by St. Xavier's Institute of Engineering" },
    { at: daysAgoIso(9, 12), role: "ro", action: "NOC_APPROVAL_CLEARED", fileNo: "TECH/FDR/2026/00274", details: "Approval Bureau NOC granted" },
    { at: daysAgoIso(7, 15), role: "grievance", action: "NOC_GRIEVANCE_CLEARED", fileNo: "TECH/FDR/2026/00274", details: "Grievance NOC issued" },
    { at: daysAgoIso(6, 11), role: "vigilance", action: "NOC_VIGILANCE_CLEARED", fileNo: "TECH/FDR/2026/00274", details: "Vigilance NOC granted" },
    { at: daysAgoIso(6, 16), role: "institution", action: "APPLICATION_SUBMITTED", fileNo: "TECH/FDR/2026/00603", details: "Joint FDR bond uploaded – PNB/FD/90214466" },
    { at: daysAgoIso(5, 10), role: "institution", action: "RELEASE_REQUESTED", fileNo: "TECH/FDR/2026/00482", details: "Release request filed by SVIET" },
    { at: daysAgoIso(3, 9), role: "institution", action: "APPLICATION_SUBMITTED", fileNo: "TECH/FDR/2026/00611", details: "Electronic deposit – UTR SBINR52026102300418827" },
    { at: daysAgoIso(3, 14), role: "ro", action: "NOC_APPROVAL_CLEARED", fileNo: "TECH/FDR/2026/00482", details: "Approval Bureau NOC granted" },
    { at: daysAgoIso(2, 12), role: "institution", action: "RELEASE_REQUESTED", fileNo: "TECH/FDR/2026/00398", details: "Release request filed by DBRMIT" },
    { at: daysAgoIso(1, 10), role: "institution", action: "RELEASE_REQUESTED", fileNo: "TECH/FDR/2026/00517", details: "Release request filed by Al-Ameen College of Pharmacy" },
  ]
  for (const ev of events) {
    audit = appendAudit(audit, { ...ev, officer: `${ROLE_META[ev.role].officer} (${ROLE_META[ev.role].designation})` })
  }

  return { records, audit }
}
