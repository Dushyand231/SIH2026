"use client"

import { useMemo, useState } from "react"
import { BellRing, FileSignature, Lock, Mail, MessageSquare, Play, ShieldCheck, ShieldX } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AlertDispatch, FdrRecord } from "@/lib/fdr/types"
import { computeAuditHash, GENESIS_HASH } from "@/lib/fdr/seed"
import { daysUntil, formatDate, formatDateTime, formatINR, maturityWindow, ROLE_META } from "@/lib/fdr/utils"
import { DscSignFlow } from "./release-order"
import { useFdrStore } from "./store"
import { EmptyRow, GovButton, NocBadge, Panel, StageBadge, StatCard, Td, Th } from "./ui"

const WINDOW_TONE: Record<string, string> = {
  Matured: "border-red-800 bg-red-700 text-white",
  "T-30": "border-red-500 bg-red-50 text-red-800",
  "T-60": "border-amber-500 bg-amber-50 text-amber-800",
  "T-90": "border-blue-500 bg-blue-50 text-blue-800",
}

export function FinancePortal() {
  const { records } = useFdrStore()
  const active = records.filter((r) => r.stage === "Vaulted" || r.stage === "Release Requested")
  const corpus = active.reduce((s, r) => s + r.principal, 0)
  const released = records.filter((r) => r.stage === "Released")
  const due = active.filter((r) => daysUntil(r.maturityDate) <= 90)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Locked Corpus" value={<span className="font-mono">{formatINR(corpus)}</span>} hint={`${active.length} FDRs under lien`} />
        <StatCard label="Maturing ≤ 90 Days" value={due.length} hint={formatINR(due.reduce((s, r) => s + r.principal, 0))} />
        <StatCard label="Pending Verification" value={records.filter((r) => r.stage === "Submitted").length} hint="At Regional Office" />
        <StatCard label="Released (this session)" value={released.length} hint={formatINR(released.reduce((s, r) => s + r.principal, 0))} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <MaturityTable records={active} />
        <CronScheduler records={active} />
      </div>
      <ReleaseDesk />
      <AuditTrail />
    </div>
  )
}

function MaturityTable({ records }: { records: FdrRecord[] }) {
  const rows = [...records].sort((a, b) => daysUntil(a.maturityDate) - daysUntil(b.maturityDate))
  return (
    <Panel title="Master Ledger · Maturity Countdown" subtitle="T-90 / T-60 / T-30 day windows" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>File No.</Th>
              <Th>Institution</Th>
              <Th>Bank / FDR</Th>
              <Th className="text-right">Principal</Th>
              <Th>Maturity</Th>
              <Th>Countdown</Th>
              <Th>Stage</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow cols={7} text="No FDRs under lien." /> : null}
            {rows.map((r) => {
              const d = daysUntil(r.maturityDate)
              const w = maturityWindow(d)
              return (
                <tr key={r.id}>
                  <Td className="font-mono text-xs">{r.fileNo}</Td>
                  <Td className="font-medium">{r.institutionName}</Td>
                  <Td className="text-xs">
                    {r.bankName}
                    <br />
                    <span className="font-mono text-muted-foreground">{r.fdrNo}</span>
                  </Td>
                  <Td className="text-right font-mono">{formatINR(r.principal)}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs">{formatDate(r.maturityDate)}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      {w ? (
                        <span className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-bold", WINDOW_TONE[w])}>{w}</span>
                      ) : null}
                      <span className="whitespace-nowrap font-mono text-xs">{d >= 0 ? `${d} days` : `${-d} days overdue`}</span>
                    </div>
                  </Td>
                  <Td><StageBadge stage={r.stage} /></Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function CronScheduler({ records }: { records: FdrRecord[] }) {
  const { alerts, runAlertJob, jobRuns } = useFdrStore()
  const [running, setRunning] = useState(false)

  function run() {
    setRunning(true)
    setTimeout(() => {
      const at = new Date().toISOString()
      const batch: AlertDispatch[] = []
      records.forEach((r) => {
        const w = maturityWindow(daysUntil(r.maturityDate))
        if (!w) return
        const slug = r.institutionName.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 10)
        batch.push(
          { id: `${r.id}-sms-${at}`, at, fileNo: r.fileNo, institutionName: r.institutionName, window: w, channel: "SMS", recipient: `+91-98XXXX${String(r.principal).slice(0, 4)}`, status: "Delivered" },
          { id: `${r.id}-mail-${at}`, at, fileNo: r.fileNo, institutionName: r.institutionName, window: w, channel: "Email", recipient: `principal@${slug}.edu.in`, status: "Delivered" },
        )
      })
      runAlertJob(batch)
      setRunning(false)
    }, 1200)
  }

  return (
    <Panel
      title="Automated Cron Scheduler"
      subtitle="Daily 06:00 IST · Maturity Alert Job"
      actions={
        <GovButton size="sm" onClick={run} disabled={running}>
          <Play className="size-3.5" aria-hidden /> {running ? "Running…" : "Run Daily Maturity Alert Job"}
        </GovButton>
      }
      bodyClassName="p-0"
    >
      <div className="h-80 overflow-y-auto bg-navy p-3 font-mono text-[11px] leading-relaxed text-slate-300" aria-live="polite" role="log">
        <p className="text-slate-500">{"$ cron: 0 6 * * * /opt/fdr/jobs/maturity-alert --windows=T-90,T-60,T-30"}</p>
        <p className="text-slate-500">{`# job runs this session: ${jobRuns}`}</p>
        {running ? <p className="text-amber-300">[RUNNING] Scanning ledger for FDRs within alert windows…</p> : null}
        {alerts.length === 0 && !running ? <p className="mt-2 text-slate-400">No notices dispatched yet. Click &quot;Run Daily Maturity Alert Job&quot;.</p> : null}
        {alerts.map((a) => (
          <p key={a.id} className="flex gap-2">
            <span className="text-slate-500">{formatDateTime(a.at).split(", ")[1]}</span>
            <span className="text-green-400">[{a.status.toUpperCase()}]</span>
            <span className={a.window === "T-30" || a.window === "Matured" ? "text-red-300" : a.window === "T-60" ? "text-amber-300" : "text-sky-300"}>{a.window}</span>
            {a.channel === "SMS" ? <MessageSquare className="mt-0.5 size-3 shrink-0" aria-label="SMS" /> : <Mail className="mt-0.5 size-3 shrink-0" aria-label="Email" />}
            <span className="truncate">
              {a.fileNo} → {a.recipient}
            </span>
          </p>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <BellRing className="size-3.5" aria-hidden /> {alerts.length} notice(s) dispatched via NIC SMS Gateway & e-Mail relay
      </div>
    </Panel>
  )
}

function ReleaseDesk() {
  const { records } = useFdrStore()
  const [signingId, setSigningId] = useState<string | null>(null)
  const rows = records.filter((r) => r.stage === "Release Requested" || r.stage === "Released")
  const signing = records.find((r) => r.id === signingId)

  return (
    <Panel title="Final Release & Disbursement Desk" subtitle="DSC unlocks only when all three Bureau NOCs are Cleared" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>File No.</Th>
              <Th>Institution</Th>
              <Th className="text-right">Principal</Th>
              <Th>Approval NOC</Th>
              <Th>Grievance NOC</Th>
              <Th>Vigilance NOC</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow cols={7} text="No release requests." /> : null}
            {rows.map((r) => {
              const allClear = Object.values(r.noc).every((n) => n.status === "Cleared")
              const forfeit = r.noc.vigilance.status === "Forfeiture Recommended"
              return (
                <tr key={r.id} className={cn(allClear && r.stage !== "Released" && "bg-green-50/60")}>
                  <Td className="font-mono text-xs">{r.fileNo}</Td>
                  <Td className="font-medium">{r.institutionName}</Td>
                  <Td className="text-right font-mono">{formatINR(r.principal)}</Td>
                  <Td><NocBadge status={r.noc.approval.status} /></Td>
                  <Td><NocBadge status={r.noc.grievance.status} /></Td>
                  <Td><NocBadge status={r.noc.vigilance.status} /></Td>
                  <Td>
                    {r.stage === "Released" ? (
                      <GovButton size="sm" variant="secondary" onClick={() => setSigningId(r.id)}>
                        <FileSignature className="size-3.5" aria-hidden /> View Release Order
                      </GovButton>
                    ) : forfeit ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-800">
                        <ShieldX className="size-4" aria-hidden /> Blocked – Forfeiture recommended
                      </span>
                    ) : (
                      <GovButton size="sm" variant="success" disabled={!allClear} onClick={() => setSigningId(r.id)} className="whitespace-normal text-left leading-tight h-auto py-1.5">
                        {allClear ? <FileSignature className="size-3.5 shrink-0" aria-hidden /> : <Lock className="size-3.5 shrink-0" aria-hidden />}
                        Apply Digital Signature (DSC) & Generate Official FDR Release Order / Bank Discharge Letter
                      </GovButton>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {signing ? <DscSignFlow record={signing} onClose={() => setSigningId(null)} /> : null}
    </Panel>
  )
}

function AuditTrail() {
  const { audit } = useFdrStore()
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; brokenAt?: number }>(null)
  const rows = useMemo(() => [...audit].reverse(), [audit])

  function verify() {
    let prev = GENESIS_HASH
    for (const e of audit) {
      const { hash, ...rest } = e
      if (e.prevHash !== prev || computeAuditHash(rest) !== hash) return setVerifyResult({ ok: false, brokenAt: e.seq })
      prev = hash
    }
    setVerifyResult({ ok: true })
  }

  return (
    <Panel
      title="Immutable SHA-256 Cryptographic Audit Trail"
      subtitle="Each entry is hash-chained to its predecessor (append-only ledger)"
      actions={
        <>
          {verifyResult ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold",
                verifyResult.ok ? "border-green-600 bg-green-50 text-green-800" : "border-red-600 bg-red-50 text-red-800",
              )}
              role="status"
            >
              {verifyResult.ok ? <ShieldCheck className="size-3.5" aria-hidden /> : <ShieldX className="size-3.5" aria-hidden />}
              {verifyResult.ok ? `Chain intact · ${audit.length} blocks verified` : `Chain broken at #${verifyResult.brokenAt}`}
            </span>
          ) : null}
          <GovButton size="sm" variant="secondary" onClick={verify}>
            <ShieldCheck className="size-3.5" aria-hidden /> Verify Chain Integrity
          </GovButton>
        </>
      }
      bodyClassName="p-0"
    >
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0">
            <tr>
              <Th>#</Th>
              <Th>Timestamp</Th>
              <Th>Role</Th>
              <Th>Officer</Th>
              <Th>Action</Th>
              <Th>File No.</Th>
              <Th>Details</Th>
              <Th>Prev Hash</Th>
              <Th>Block Hash (SHA-256)</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.seq} className="hover:bg-muted">
                <Td className="font-mono text-xs">{e.seq}</Td>
                <Td className="whitespace-nowrap font-mono text-[11px]">{formatDateTime(e.at)}</Td>
                <Td className="whitespace-nowrap text-xs font-semibold">{ROLE_META[e.role].code}</Td>
                <Td className="text-xs">{e.officer}</Td>
                <Td className="whitespace-nowrap font-mono text-[11px] font-semibold text-primary">{e.action}</Td>
                <Td className="whitespace-nowrap font-mono text-[11px]">{e.fileNo}</Td>
                <Td className="min-w-48 text-xs">{e.details}</Td>
                <Td className="font-mono text-[11px] text-muted-foreground" >
                  <span title={e.prevHash}>{e.prevHash.slice(0, 10)}…</span>
                </Td>
                <Td className="font-mono text-[11px]">
                  <span title={e.hash}>{e.hash.slice(0, 16)}…</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
