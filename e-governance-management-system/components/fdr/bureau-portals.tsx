"use client"

import { useState } from "react"
import { AlertOctagon, Ban, CheckCircle2, Gavel, PauseCircle, Search, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatINR } from "@/lib/fdr/utils"
import { CaseList, FileHeader } from "./case-list"
import { useFdrStore } from "./store"
import { EmptyRow, GovButton, NocBadge, NoteSheet, Panel, RemarkBox, StatCard, Td, Th } from "./ui"

function useReleaseQueue() {
  const { records } = useFdrStore()
  return records.filter((r) => r.stage === "Release Requested")
}

function CheckTile({ label, count, nilText }: { label: string; count: number; nilText?: string }) {
  const clear = count === 0
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-sm border px-3 py-2", clear ? "border-green-600 bg-green-50" : "border-red-500 bg-red-50")}>
      <div className="flex items-center gap-2">
        {clear ? <CheckCircle2 className="size-5 text-green-700" aria-hidden /> : <AlertOctagon className="size-5 text-red-700" aria-hidden />}
        <span className={cn("text-sm font-medium", clear ? "text-green-900" : "text-red-900")}>{label}</span>
      </div>
      <span className={cn("font-mono text-lg font-bold", clear ? "text-green-800" : "text-red-800")}>
        {clear && nilText ? nilText : `(${count})`}
      </span>
    </div>
  )
}

export function GrievancePortal() {
  const queue = useReleaseQueue()
  const { setNoc } = useFdrStore()
  const [selectedId, setSelectedId] = useState<string | undefined>(queue.find((r) => r.noc.grievance.status === "Pending")?.id)
  const [remark, setRemark] = useState("")
  const r = queue.find((x) => x.id === selectedId) ?? queue[0]
  const pending = queue.filter((x) => x.noc.grievance.status === "Pending").length
  const total = r ? r.grievance.facultySalary + r.grievance.feeRefund + r.grievance.ombudsman : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Awaiting Grievance NOC" value={pending} />
        <StatCard label="Cleared" value={queue.filter((x) => x.noc.grievance.status === "Cleared").length} />
        <StatCard label="On Hold" value={queue.filter((x) => x.noc.grievance.status === "On Hold").length} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,460px)_1fr]">
        <CaseList
          title="Requests Awaiting Grievance NOC"
          subtitle="FDR release requests forwarded for grievance clearance"
          records={queue}
          selectedId={r?.id}
          onSelect={(id) => {
            setSelectedId(id)
            setRemark("")
          }}
          statusCell={(x) => <NocBadge status={x.noc.grievance.status} />}
          emptyText="No requests pending."
        />
        {r ? (
          <Panel title="Automated Grievance Background Check" subtitle={`Against Institution ID ${r.institutionId}`}>
            <FileHeader r={r} right={<NocBadge status={r.noc.grievance.status} />} />
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="size-3.5" aria-hidden /> Queried: Faculty Grievance Portal · Student Grievance Portal · Ombudsman Registry
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <CheckTile label="Pending Faculty Salary Disputes" count={r.grievance.facultySalary} />
              <CheckTile label="Student Fee Refund Complaints" count={r.grievance.feeRefund} />
              <CheckTile label="Ombudsman Cases" count={r.grievance.ombudsman} nilText="(Nil)" />
            </div>
            {total > 0 ? (
              <p role="alert" className="mt-3 rounded-sm border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800">
                {total} unresolved grievance(s) found. Clearance cannot be issued until resolved.
              </p>
            ) : null}
            <div className="mt-4">
              <NoteSheet entries={r.noteSheet}>
                {r.noc.grievance.status === "Pending" ? (
                  <>
                    <RemarkBox id="grc-remark" value={remark} onChange={setRemark} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <GovButton
                        variant="success"
                        disabled={remark.trim().length < 5 || total > 0}
                        onClick={() => {
                          setNoc(r.id, "grievance", "Cleared", remark.trim())
                          setRemark("")
                        }}
                      >
                        <ShieldCheck className="size-4" aria-hidden /> Issue Grievance Clearance (NOC)
                      </GovButton>
                      <GovButton
                        variant="warning"
                        disabled={remark.trim().length < 5}
                        onClick={() => {
                          setNoc(r.id, "grievance", "On Hold", remark.trim())
                          setRemark("")
                        }}
                      >
                        <PauseCircle className="size-4" aria-hidden /> Flag Hold due to Pending Complaint
                      </GovButton>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-green-900">Grievance Cell action recorded: <NocBadge status={r.noc.grievance.status} /></p>
                )}
              </NoteSheet>
            </div>
          </Panel>
        ) : (
          <Panel title="Automated Grievance Background Check">
            <p className="py-8 text-center text-sm text-muted-foreground">No requests in queue.</p>
          </Panel>
        )}
      </div>
    </div>
  )
}

export function VigilancePortal() {
  const queue = useReleaseQueue()
  const { setNoc } = useFdrStore()
  const [selectedId, setSelectedId] = useState<string | undefined>(queue.find((r) => r.noc.vigilance.status === "Pending")?.id)
  const [remark, setRemark] = useState("")
  const r = queue.find((x) => x.id === selectedId) ?? queue[0]
  const pendingCases = r ? r.legal.cases.filter((c) => c.status === "Pending").length : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Awaiting Vigilance NOC" value={queue.filter((x) => x.noc.vigilance.status === "Pending").length} />
        <StatCard label="Cleared" value={queue.filter((x) => x.noc.vigilance.status === "Cleared").length} />
        <StatCard label="Legal Hold" value={queue.filter((x) => x.noc.vigilance.status === "On Hold").length} />
        <StatCard label="Forfeiture Recommended" value={queue.filter((x) => x.noc.vigilance.status === "Forfeiture Recommended").length} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,460px)_1fr]">
        <CaseList
          title="Requests Awaiting Vigilance NOC"
          subtitle="Court case & investigation registry clearance"
          records={queue}
          selectedId={r?.id}
          onSelect={(id) => {
            setSelectedId(id)
            setRemark("")
          }}
          statusCell={(x) => <NocBadge status={x.noc.vigilance.status} />}
          emptyText="No requests pending."
        />
        {r ? (
          <Panel title="Court Case / Investigation Registry" subtitle={`Search against Trust: ${r.trustName}`}>
            <FileHeader
              r={r}
              right={
                <div className="flex flex-col items-end gap-1">
                  <NocBadge status={r.noc.vigilance.status} />
                  <span
                    className={cn(
                      "rounded-sm border px-1.5 py-0.5 text-[11px] font-bold uppercase",
                      r.legal.severity === "Severe" ? "border-red-700 bg-red-700 text-white" : r.legal.severity === "Minor" ? "border-amber-500 bg-amber-50 text-amber-800" : "border-green-600 bg-green-50 text-green-800",
                    )}
                  >
                    Risk: {r.legal.severity}
                  </span>
                </div>
              }
            />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Case / Ref No.</Th>
                    <Th>Forum</Th>
                    <Th>Nature</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {r.legal.cases.length === 0 ? <EmptyRow cols={4} text="Registry search returned NIL records against the Institution / Trust." /> : null}
                  {r.legal.cases.map((c) => (
                    <tr key={c.caseNo}>
                      <Td className="font-mono text-xs">{c.caseNo}</Td>
                      <Td>{c.forum}</Td>
                      <Td>{c.nature}</Td>
                      <Td>
                        <span className={cn("text-xs font-semibold", c.status === "Pending" ? "text-red-700" : "text-green-700")}>{c.status}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.legal.severity === "Severe" ? (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-sm border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-900">
                <Gavel className="mt-0.5 size-4 shrink-0" aria-hidden />
                Severe regulatory violations detected. Deposit of {formatINR(r.principal)} may be recommended for penal forfeiture / encashment.
              </div>
            ) : null}
            <div className="mt-4">
              <NoteSheet entries={r.noteSheet}>
                {r.noc.vigilance.status === "Pending" ? (
                  <>
                    <RemarkBox id="vlc-remark" value={remark} onChange={setRemark} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <GovButton
                        variant="success"
                        disabled={remark.trim().length < 5 || pendingCases > 0}
                        onClick={() => {
                          setNoc(r.id, "vigilance", "Cleared", remark.trim())
                          setRemark("")
                        }}
                      >
                        <ShieldCheck className="size-4" aria-hidden /> Grant Vigilance NOC
                      </GovButton>
                      <GovButton
                        variant="warning"
                        disabled={remark.trim().length < 5}
                        onClick={() => {
                          setNoc(r.id, "vigilance", "On Hold", remark.trim())
                          setRemark("")
                        }}
                      >
                        <PauseCircle className="size-4" aria-hidden /> Place Legal Hold
                      </GovButton>
                      <GovButton
                        variant="danger"
                        disabled={remark.trim().length < 5}
                        onClick={() => {
                          setNoc(r.id, "vigilance", "Forfeiture Recommended", remark.trim())
                          setRemark("")
                        }}
                      >
                        <Ban className="size-4" aria-hidden /> Trigger Penal Forfeiture / Encashment Recommendation
                      </GovButton>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-green-900">Vigilance Cell action recorded: <NocBadge status={r.noc.vigilance.status} /></p>
                )}
              </NoteSheet>
            </div>
          </Panel>
        ) : (
          <Panel title="Court Case / Investigation Registry">
            <p className="py-8 text-center text-sm text-muted-foreground">No requests in queue.</p>
          </Panel>
        )}
      </div>
    </div>
  )
}

