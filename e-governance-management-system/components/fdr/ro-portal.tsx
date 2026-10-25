"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FdrRecord } from "@/lib/fdr/types"
import { daysUntil, formatDate, formatINR } from "@/lib/fdr/utils"
import { CaseList, FileHeader } from "./case-list"
import { useFdrStore } from "./store"
import { GovButton, KV, NocBadge, NoteSheet, Panel, RemarkBox, StageBadge, Stamp } from "./ui"

export function RoPortal() {
  const [tab, setTab] = useState<"verify" | "noc">("verify")
  const { records } = useFdrStore()
  const queue = records.filter((r) => r.stage === "Submitted")
  const nocQueue = records.filter((r) => r.stage === "Release Requested")

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Regional Office desks" className="flex flex-wrap gap-1 border-b border-border">
        {(
          [
            ["verify", `Incoming FDR Verification Queue (${queue.length})`],
            ["noc", `Maturity NOC – Approval Bureau (${nocQueue.filter((r) => r.noc.approval.status === "Pending").length})`],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "-mb-px rounded-t-sm border border-b-0 px-3 py-2 text-sm font-medium",
              tab === k ? "border-border bg-card text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "verify" ? <VerificationDesk queue={queue} /> : <ApprovalNocDesk queue={nocQueue} />}
    </div>
  )
}

function VerificationDesk({ queue }: { queue: FdrRecord[] }) {
  const { roVerify, roDeficiency } = useFdrStore()
  const [selectedId, setSelectedId] = useState<string | undefined>(queue[0]?.id)
  const [remark, setRemark] = useState("")
  const r = queue.find((x) => x.id === selectedId) ?? queue[0]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,460px)_1fr]">
      <CaseList
        title="Maker-Checker Desk"
        subtitle="FDR instruments awaiting physical & digital verification"
        records={queue}
        selectedId={r?.id}
        onSelect={(id) => {
          setSelectedId(id)
          setRemark("")
        }}
        statusCell={(x) => <StageBadge stage={x.stage} />}
        emptyText="No instruments pending verification."
      />
      {r ? (
        <Panel title="Instrument Verification" subtitle="Scan vs OCR-extracted particulars">
          <FileHeader r={r} right={<Stamp label={r.mode === "Joint FDR Bond" ? "Joint FDR" : "e-Deposit"} tone="blue" />} />
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {r.mode === "Joint FDR Bond" ? (
              <figure className="flex flex-col gap-1">
                <div className="aspect-[4/3] overflow-hidden rounded-sm border border-border bg-muted">
                  <img src={r.scanUrl ?? "/images/fdr-bond-scan.png"} alt={`Scanned FDR bond for ${r.institutionName}`} className="size-full object-contain" />
                </div>
                <figcaption className="font-mono text-[11px] text-muted-foreground">{r.scanName}</figcaption>
              </figure>
            ) : (
              <div className="flex flex-col gap-2 rounded-sm border border-border bg-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remittance Gateway Response</p>
                <pre className="overflow-x-auto rounded-sm bg-navy p-2 font-mono text-[11px] leading-relaxed text-green-300">
{`{
  "utr": "${r.utrNo}",
  "status": "CREDITED",
  "amount": ${r.principal},
  "beneficiary": "SD-ESCROW-3920XXXX4471",
  "valueDate": "${r.issueDate}"
}`}
                </pre>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <OcrComparison r={r} />
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-sm border border-border bg-muted px-2 py-1">
                  OCR Confidence: <b className="font-mono">{r.ocrConfidence ? `${r.ocrConfidence}%` : "N/A"}</b>
                </span>
                <span
                  className={cn(
                    "rounded-sm border px-2 py-1",
                    r.tamperCheck === "Passed" ? "border-green-600 bg-green-50 text-green-800" : "border-border bg-muted",
                  )}
                >
                  Tamper Check: <b>{r.tamperCheck === "Not Run" ? "N/A (electronic)" : r.tamperCheck}</b>
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <NoteSheet entries={r.noteSheet}>
              <RemarkBox id="ro-remark" value={remark} onChange={setRemark} />
              <div className="mt-2 flex flex-wrap gap-2">
                <GovButton
                  variant="success"
                  disabled={remark.trim().length < 5}
                  onClick={() => {
                    roVerify(r.id, remark.trim())
                    setRemark("")
                    setSelectedId(undefined)
                  }}
                >
                  <Lock className="size-4" aria-hidden /> Verify & Lock FDR in Vault
                </GovButton>
                <GovButton
                  variant="danger"
                  disabled={remark.trim().length < 5}
                  onClick={() => {
                    roDeficiency(r.id, remark.trim())
                    setRemark("")
                    setSelectedId(undefined)
                  }}
                >
                  <AlertTriangle className="size-4" aria-hidden /> Raise Deficiency Query
                </GovButton>
              </div>
            </NoteSheet>
          </div>
        </Panel>
      ) : (
        <Panel title="Instrument Verification">
          <p className="py-8 text-center text-sm text-muted-foreground">Queue cleared. All submitted instruments have been processed.</p>
        </Panel>
      )}
    </div>
  )
}

function OcrComparison({ r }: { r: FdrRecord }) {
  const rows: Array<[string, string, boolean]> = [
    ["Bank Name", r.bankName, true],
    ["FDR / Ref No.", r.fdrNo, true],
    ["Issue Date", formatDate(r.issueDate), true],
    ["Maturity Date", formatDate(r.maturityDate), true],
    ["Principal", formatINR(r.principal), r.principal >= r.requiredAmount],
    ["Required (Assessed)", formatINR(r.requiredAmount), true],
    ["Lien Status", r.lienStatus, /Regulatory Authority/.test(r.lienStatus)],
  ]
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-primary text-primary-foreground">
          <th scope="col" className="border border-border px-2 py-1 text-left text-[11px] uppercase">Field</th>
          <th scope="col" className="border border-border px-2 py-1 text-left text-[11px] uppercase">Extracted Value</th>
          <th scope="col" className="border border-border px-2 py-1 text-center text-[11px] uppercase">Check</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, v, ok]) => (
          <tr key={k}>
            <th scope="row" className="border border-border bg-muted px-2 py-1 text-left text-xs font-medium text-muted-foreground">{k}</th>
            <td className="border border-border px-2 py-1 font-mono text-xs">{v}</td>
            <td className="border border-border px-2 py-1 text-center">
              {ok ? <CheckCircle2 className="mx-auto size-4 text-green-700" aria-label="Matched" /> : <XCircle className="mx-auto size-4 text-red-700" aria-label="Mismatch" />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ApprovalNocDesk({ queue }: { queue: FdrRecord[] }) {
  const { setNoc } = useFdrStore()
  const [selectedId, setSelectedId] = useState<string | undefined>(queue.find((r) => r.noc.approval.status === "Pending")?.id)
  const [remark, setRemark] = useState("")
  const r = queue.find((x) => x.id === selectedId) ?? queue[0]
  const compliant = r ? r.eoa.continuous && r.eoa.academicCompliance : false

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,460px)_1fr]">
      <CaseList
        title="Maturing FDRs – Release Requests"
        subtitle="Approval Bureau NOC required"
        records={queue}
        selectedId={r?.id}
        onSelect={(id) => {
          setSelectedId(id)
          setRemark("")
        }}
        statusCell={(x) => <NocBadge status={x.noc.approval.status} />}
        emptyText="No release requests pending."
      />
      {r ? (
        <Panel title="EoA Continuity & Academic Compliance Check">
          <FileHeader r={r} right={<NocBadge status={r.noc.approval.status} />} />
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <KV
              rows={[
                ["Last EoA Granted", r.eoa.lastEoaYear],
                ["EoA Continuity (8 yrs)", <Check key="c" ok={r.eoa.continuous} />],
                ["Academic Compliance", <Check key="a" ok={r.eoa.academicCompliance} />],
                ["Intake Variance", r.eoa.intakeVariance],
                ["Maturity", `${formatDate(r.maturityDate)} (${daysUntil(r.maturityDate)} days)`],
              ]}
            />
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-sm border p-4 text-center",
                compliant ? "border-green-600 bg-green-50" : "border-red-500 bg-red-50",
              )}
            >
              {compliant ? <ShieldCheck className="size-8 text-green-700" aria-hidden /> : <AlertTriangle className="size-8 text-red-700" aria-hidden />}
              <p className={cn("text-sm font-semibold", compliant ? "text-green-900" : "text-red-900")}>
                {compliant ? "Institution is compliant. NOC may be granted." : "Non-compliance detected. Grant of NOC not advisable."}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <NoteSheet entries={r.noteSheet}>
              {r.noc.approval.status === "Pending" ? (
                <>
                  <RemarkBox id="eoa-remark" value={remark} onChange={setRemark} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <GovButton
                      variant="success"
                      disabled={remark.trim().length < 5}
                      onClick={() => {
                        setNoc(r.id, "approval", "Cleared", remark.trim())
                        setRemark("")
                      }}
                    >
                      <ShieldCheck className="size-4" aria-hidden /> Grant Approval Bureau NOC
                    </GovButton>
                    <GovButton
                      variant="danger"
                      disabled={remark.trim().length < 5}
                      onClick={() => {
                        setNoc(r.id, "approval", "On Hold", remark.trim())
                        setRemark("")
                      }}
                    >
                      <AlertTriangle className="size-4" aria-hidden /> Withhold NOC
                    </GovButton>
                  </div>
                </>
              ) : (
                <p className="text-sm text-green-900">Approval Bureau action recorded: <NocBadge status={r.noc.approval.status} /></p>
              )}
            </NoteSheet>
          </div>
        </Panel>
      ) : (
        <Panel title="EoA Continuity & Academic Compliance Check">
          <p className="py-8 text-center text-sm text-muted-foreground">No release requests in queue.</p>
        </Panel>
      )}
    </div>
  )
}

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 font-semibold text-green-800">
      <CheckCircle2 className="size-4" aria-hidden /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-red-800">
      <XCircle className="size-4" aria-hidden /> No
    </span>
  )
}
