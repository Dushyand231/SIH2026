"use client"

import { useState, type ReactNode } from "react"
import { Check, Circle, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FdrRecord } from "@/lib/fdr/types"
import { daysUntil, formatDate, formatINR } from "@/lib/fdr/utils"
import { useFdrStore } from "../store"
import { GovButton, KV, NocBadge, NoteSheet, Panel, RemarkBox, StageBadge, Stamp } from "../ui"
import { SubmissionForm } from "./submission-form"

export function InstitutionPortal() {
  const { records } = useFdrStore()
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "")
  const [view, setView] = useState<"track" | "new">("track")
  const selected = records.find((r) => r.id === selectedId) ?? records[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-sm border border-border bg-card p-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="inst-select" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Logged-in Institution (Trust SSO)
          </label>
          <select
            id="inst-select"
            value={selected?.id}
            onChange={(e) => {
              setSelectedId(e.target.value)
              setView("track")
            }}
            className="h-9 min-w-72 rounded-sm border border-input bg-card px-2 text-sm font-medium focus:outline-2 focus:outline-ring"
          >
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.institutionName} – {r.fileNo}
              </option>
            ))}
          </select>
        </div>
        <div role="tablist" aria-label="Institution actions" className="flex gap-1">
          <GovButton variant={view === "track" ? "primary" : "secondary"} role="tab" aria-selected={view === "track"} onClick={() => setView("track")}>
            Live Application Tracker
          </GovButton>
          <GovButton variant={view === "new" ? "primary" : "secondary"} role="tab" aria-selected={view === "new"} onClick={() => setView("new")}>
            New Deposit Application
          </GovButton>
        </div>
      </div>

      {view === "new" ? (
        <SubmissionForm
          onSubmitted={(id) => {
            setSelectedId(id)
            setView("track")
          }}
        />
      ) : selected ? (
        <ApplicationTracker record={selected} />
      ) : null}
    </div>
  )
}

function Step({ label, state, sub }: { label: string; state: "done" | "active" | "todo" | "fail"; sub?: string }) {
  return (
    <li className="flex flex-1 flex-col items-center gap-1 text-center">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full border-2",
          state === "done" && "border-green-700 bg-green-700 text-white",
          state === "active" && "border-amber-500 bg-amber-50 text-amber-700",
          state === "todo" && "border-border bg-card text-muted-foreground",
          state === "fail" && "border-red-700 bg-red-700 text-white",
        )}
      >
        {state === "done" ? <Check className="size-4" aria-hidden /> : state === "fail" ? <X className="size-4" aria-hidden /> : <Circle className="size-3" aria-hidden />}
      </span>
      <span className="text-xs font-semibold leading-tight">{label}</span>
      {sub ? <span className="text-[11px] text-muted-foreground">{sub}</span> : null}
      <span className="sr-only">Status: {state}</span>
    </li>
  )
}

function ApplicationTracker({ record: r }: { record: FdrRecord }) {
  const { requestRelease, resubmit } = useFdrStore()
  const [reply, setReply] = useState("")
  const days = daysUntil(r.maturityDate)
  const nocs = Object.values(r.noc)
  const allCleared = nocs.every((n) => n.status === "Cleared")
  const anyBlocked = nocs.some((n) => n.status === "On Hold" || n.status === "Forfeiture Recommended")
  const stageIdx = { Submitted: 0, "Deficiency Raised": 0, Vaulted: 1, "Release Requested": 2, Released: 4, Forfeited: 4 }[r.stage]

  const st = (i: number): "done" | "active" | "todo" => (stageIdx > i ? "done" : stageIdx === i ? "active" : "todo")

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <Panel
          title="Live Application Tracker"
          subtitle={`File No: ${r.fileNo} · ${r.institutionId}`}
          actions={<StageBadge stage={r.stage} />}
        >
          <ol className="flex items-start gap-2" aria-label="Application progress">
            <Step label="Submitted" state={r.stage === "Deficiency Raised" ? "fail" : st(0) === "active" ? "active" : "done"} sub={formatDate(r.submittedAt)} />
            <Step label="RO Verified & Vaulted" state={st(1)} />
            <Step label="Release Requested" state={st(2)} />
            <Step label="Bureau NOCs" state={stageIdx < 2 ? "todo" : anyBlocked ? "fail" : allCleared ? "done" : "active"} />
            <Step label="Finance Release (DSC)" state={r.stage === "Released" ? "done" : allCleared && r.stage === "Release Requested" ? "active" : "todo"} />
          </ol>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="mb-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Real-time NOC Clearance Status across Bureaus
              </caption>
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th scope="col" className="border border-border px-2 py-1.5 text-left text-[11px] uppercase">Bureau</th>
                  <th scope="col" className="border border-border px-2 py-1.5 text-left text-[11px] uppercase">Status</th>
                  <th scope="col" className="border border-border px-2 py-1.5 text-left text-[11px] uppercase">Officer</th>
                  <th scope="col" className="border border-border px-2 py-1.5 text-left text-[11px] uppercase">Remark</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Approval Bureau (RO)", r.noc.approval],
                    ["Grievance Redressal Cell", r.noc.grievance],
                    ["Vigilance & Legal Cell", r.noc.vigilance],
                  ] as const
                ).map(([name, n]) => (
                  <tr key={name}>
                    <td className="border border-border px-2 py-1.5 font-medium">{name}</td>
                    <td className="border border-border px-2 py-1.5"><NocBadge status={n.status} /></td>
                    <td className="border border-border px-2 py-1.5 text-xs">{n.officer ?? "—"}</td>
                    <td className="border border-border px-2 py-1.5 text-xs">{n.remark ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {r.stage === "Vaulted" ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-muted p-3">
              <p className="text-sm">
                {days <= 90
                  ? `FDR matures in ${days} day(s). You may now apply for release.`
                  : `Release can be requested within 90 days of maturity (${days} days remaining).`}
              </p>
              <GovButton onClick={() => requestRelease(r.id)} disabled={days > 90}>
                <Send className="size-4" aria-hidden /> Request FDR Release
              </GovButton>
            </div>
          ) : null}

          {r.stage === "Deficiency Raised" ? (
            <div className="mt-4 flex flex-col gap-2 rounded-sm border border-red-400 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-800">Deficiency query raised by Regional Office. See Note-Sheet for details.</p>
              <RemarkBox id="deficiency-reply" value={reply} onChange={setReply} label="Compliance Reply" placeholder="State how the deficiency has been rectified…" />
              <div>
                <GovButton
                  disabled={reply.trim().length < 10}
                  onClick={() => {
                    resubmit(r.id, reply.trim())
                    setReply("")
                  }}
                >
                  Submit Compliance & Resubmit
                </GovButton>
              </div>
            </div>
          ) : null}

          {r.stage === "Released" && r.releaseOrder ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-green-600 bg-green-50 p-3">
              <p className="text-sm text-green-900">
                Release Order <span className="font-mono font-semibold">{r.releaseOrder.omNo}</span> issued. Bank Discharge Letter dispatched to {r.bankName}.
              </p>
              <Stamp label="Released" sub={formatDate(r.releaseOrder.signedAt)} />
            </div>
          ) : null}
        </Panel>

        <Panel title="Deposit Particulars">
          <KV
            rows={[
              ["Institution", r.institutionName],
              ["Trust / Society", r.trustName],
              ["Location", `${r.city}${r.state !== "—" ? `, ${r.state}` : ""} · ${r.region}`],
              ["Category", `${r.course} · ${r.trustCategory} · ${r.premises}`],
              ["Required Deposit", <span key="req" className="font-mono">{formatINR(r.requiredAmount)}</span>],
              ["Mode", r.mode],
              ["Bank / Instrument", `${r.bankName} · ${r.fdrNo}`],
              ["Principal", <span key="p" className="font-mono font-semibold">{formatINR(r.principal)}</span>],
              ["Issue → Maturity", `${formatDate(r.issueDate)} → ${formatDate(r.maturityDate)} (${days >= 0 ? `${days} days left` : `matured ${-days} days ago`})`],
              ["Lien Status", r.lienStatus],
              ...(r.utrNo ? ([["UTR", <span key="u" className="font-mono">{r.utrNo}</span>]] as Array<[string, ReactNode]>) : []),
            ]}
          />
        </Panel>
      </div>
      <NoteSheet entries={r.noteSheet} />
    </div>
  )
}
