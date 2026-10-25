"use client"

import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from "react"
import { appendAudit, buildSeed } from "@/lib/fdr/seed"
import type { AlertDispatch, AuditEntry, Bureau, FdrRecord, NocStatus, ReleaseOrder, Role } from "@/lib/fdr/types"
import { ROLE_META } from "@/lib/fdr/utils"

interface State {
  records: FdrRecord[]
  audit: AuditEntry[]
  alerts: AlertDispatch[]
  jobRuns: number
}

type Action =
  | { type: "SUBMIT"; record: FdrRecord; at: string }
  | { type: "RO_VERIFY"; id: string; remark: string; at: string }
  | { type: "RO_DEFICIENCY"; id: string; remark: string; at: string }
  | { type: "RESUBMIT"; id: string; remark: string; at: string }
  | { type: "REQUEST_RELEASE"; id: string; at: string }
  | { type: "SET_NOC"; id: string; bureau: Bureau; status: NocStatus; remark: string; at: string }
  | { type: "RUN_ALERT_JOB"; alerts: AlertDispatch[]; at: string }
  | { type: "RELEASE"; id: string; order: ReleaseOrder; at: string }

const BUREAU_ROLE: Record<Bureau, Role> = { approval: "ro", grievance: "grievance", vigilance: "vigilance" }

function officerOf(role: Role) {
  return `${ROLE_META[role].officer} (${ROLE_META[role].designation})`
}

function noteFor(role: Role, remark: string, at: string) {
  return {
    id: `${role}-${at}`,
    role,
    officer: ROLE_META[role].officer,
    designation: ROLE_META[role].designation,
    remark,
    at,
  }
}

function updateRecord(state: State, id: string, fn: (r: FdrRecord) => FdrRecord) {
  return state.records.map((r) => (r.id === id ? fn(r) : r))
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SUBMIT": {
      const r = action.record
      return {
        ...state,
        records: [r, ...state.records],
        audit: appendAudit(state.audit, {
          at: action.at,
          role: "institution",
          officer: `${ROLE_META.institution.officer} – ${r.trustName}`,
          action: "APPLICATION_SUBMITTED",
          fileNo: r.fileNo,
          details: r.mode === "Joint FDR Bond" ? `Joint FDR bond uploaded – ${r.fdrNo}` : `Electronic deposit – UTR ${r.utrNo}`,
        }),
      }
    }
    case "RO_VERIFY":
    case "RO_DEFICIENCY": {
      const rec = state.records.find((r) => r.id === action.id)
      if (!rec) return state
      const verified = action.type === "RO_VERIFY"
      return {
        ...state,
        records: updateRecord(state, action.id, (r) => ({
          ...r,
          stage: verified ? "Vaulted" : "Deficiency Raised",
          noteSheet: [...r.noteSheet, noteFor("ro", action.remark, action.at)],
        })),
        audit: appendAudit(state.audit, {
          at: action.at,
          role: "ro",
          officer: officerOf("ro"),
          action: verified ? "FDR_VERIFIED_LOCKED" : "DEFICIENCY_RAISED",
          fileNo: rec.fileNo,
          details: action.remark,
        }),
      }
    }
    case "RESUBMIT": {
      const rec = state.records.find((r) => r.id === action.id)
      if (!rec) return state
      return {
        ...state,
        records: updateRecord(state, action.id, (r) => ({
          ...r,
          stage: "Submitted",
          noteSheet: [...r.noteSheet, noteFor("institution", action.remark, action.at)],
        })),
        audit: appendAudit(state.audit, {
          at: action.at,
          role: "institution",
          officer: `${ROLE_META.institution.officer} – ${rec.trustName}`,
          action: "DEFICIENCY_COMPLIED",
          fileNo: rec.fileNo,
          details: action.remark,
        }),
      }
    }
    case "REQUEST_RELEASE": {
      const rec = state.records.find((r) => r.id === action.id)
      if (!rec) return state
      return {
        ...state,
        records: updateRecord(state, action.id, (r) => ({
          ...r,
          stage: "Release Requested",
          noc: { approval: { status: "Pending" }, grievance: { status: "Pending" }, vigilance: { status: "Pending" } },
          noteSheet: [...r.noteSheet, noteFor("institution", "Request for release of security deposit FDR submitted.", action.at)],
        })),
        audit: appendAudit(state.audit, {
          at: action.at,
          role: "institution",
          officer: `${ROLE_META.institution.officer} – ${rec.trustName}`,
          action: "RELEASE_REQUESTED",
          fileNo: rec.fileNo,
          details: `Release request filed by ${rec.institutionName}`,
        }),
      }
    }
    case "SET_NOC": {
      const rec = state.records.find((r) => r.id === action.id)
      if (!rec) return state
      const role = BUREAU_ROLE[action.bureau]
      const code =
        action.status === "Cleared" ? "CLEARED" : action.status === "On Hold" ? "HOLD" : "FORFEITURE_RECOMMENDED"
      return {
        ...state,
        records: updateRecord(state, action.id, (r) => ({
          ...r,
          noc: {
            ...r.noc,
            [action.bureau]: { status: action.status, officer: ROLE_META[role].officer, remark: action.remark, at: action.at },
          },
          noteSheet: [...r.noteSheet, noteFor(role, action.remark, action.at)],
        })),
        audit: appendAudit(state.audit, {
          at: action.at,
          role,
          officer: officerOf(role),
          action: `NOC_${action.bureau.toUpperCase()}_${code}`,
          fileNo: rec.fileNo,
          details: action.remark,
        }),
      }
    }
    case "RUN_ALERT_JOB": {
      return {
        ...state,
        alerts: [...action.alerts, ...state.alerts],
        jobRuns: state.jobRuns + 1,
        audit: appendAudit(state.audit, {
          at: action.at,
          role: "finance",
          officer: "SYSTEM CRON (Daily Maturity Alert Job)",
          action: "CRON_MATURITY_ALERTS",
          fileNo: "—",
          details: `${action.alerts.length} SMS/Email notices dispatched`,
        }),
      }
    }
    case "RELEASE": {
      const rec = state.records.find((r) => r.id === action.id)
      if (!rec) return state
      return {
        ...state,
        records: updateRecord(state, action.id, (r) => ({
          ...r,
          stage: "Released",
          lienStatus: "Lien vacated – Discharge letter issued to bank",
          releaseOrder: action.order,
          noteSheet: [
            ...r.noteSheet,
            noteFor("finance", `Release Order ${action.order.omNo} digitally signed and Bank Discharge Letter generated.`, action.at),
          ],
        })),
        audit: appendAudit(state.audit, {
          at: action.at,
          role: "finance",
          officer: officerOf("finance"),
          action: "DSC_RELEASE_ORDER_SIGNED",
          fileNo: rec.fileNo,
          details: `OM ${action.order.omNo} · DSC ${action.order.dscSerial}`,
        }),
      }
    }
  }
}

interface StoreValue extends State {
  submit: (record: FdrRecord) => void
  roVerify: (id: string, remark: string) => void
  roDeficiency: (id: string, remark: string) => void
  resubmit: (id: string, remark: string) => void
  requestRelease: (id: string) => void
  setNoc: (id: string, bureau: Bureau, status: NocStatus, remark: string) => void
  runAlertJob: (alerts: AlertDispatch[]) => void
  release: (id: string, order: ReleaseOrder) => void
}

const StoreContext = createContext<StoreValue | null>(null)

const now = () => new Date().toISOString()

export function FdrStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const seed = buildSeed()
    return { records: seed.records, audit: seed.audit, alerts: [], jobRuns: 0 }
  })

  const submit = useCallback((record: FdrRecord) => dispatch({ type: "SUBMIT", record, at: now() }), [])
  const roVerify = useCallback((id: string, remark: string) => dispatch({ type: "RO_VERIFY", id, remark, at: now() }), [])
  const roDeficiency = useCallback(
    (id: string, remark: string) => dispatch({ type: "RO_DEFICIENCY", id, remark, at: now() }),
    [],
  )
  const resubmit = useCallback((id: string, remark: string) => dispatch({ type: "RESUBMIT", id, remark, at: now() }), [])
  const requestRelease = useCallback((id: string) => dispatch({ type: "REQUEST_RELEASE", id, at: now() }), [])
  const setNoc = useCallback(
    (id: string, bureau: Bureau, status: NocStatus, remark: string) =>
      dispatch({ type: "SET_NOC", id, bureau, status, remark, at: now() }),
    [],
  )
  const runAlertJob = useCallback((alerts: AlertDispatch[]) => dispatch({ type: "RUN_ALERT_JOB", alerts, at: now() }), [])
  const release = useCallback((id: string, order: ReleaseOrder) => dispatch({ type: "RELEASE", id, order, at: now() }), [])

  const value = useMemo(
    () => ({ ...state, submit, roVerify, roDeficiency, resubmit, requestRelease, setNoc, runAlertJob, release }),
    [state, submit, roVerify, roDeficiency, resubmit, requestRelease, setNoc, runAlertJob, release],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useFdrStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useFdrStore must be used within FdrStoreProvider")
  return ctx
}

type Lang = "en" | "hi"
interface PrefsValue {
  role: Role
  setRole: (r: Role) => void
  lang: Lang
  setLang: (l: Lang) => void
  fontScale: number
  setFontScale: (n: number) => void
  highContrast: boolean
  setHighContrast: (b: boolean) => void
  t: (en: string, hi: string) => string
}

const PrefsContext = createContext<PrefsValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("institution")
  const [lang, setLang] = useState<Lang>("en")
  const [fontScale, setFontScale] = useState(100)
  const [highContrast, setHighContrast] = useState(false)
  const t = useCallback((en: string, hi: string) => (lang === "hi" ? hi : en), [lang])
  const value = useMemo(
    () => ({ role, setRole, lang, setLang, fontScale, setFontScale, highContrast, setHighContrast, t }),
    [role, lang, fontScale, highContrast, t],
  )
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider")
  return ctx
}
