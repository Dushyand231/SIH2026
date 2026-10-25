"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { FdrRecord } from "@/lib/fdr/types"
import { daysUntil, formatINR } from "@/lib/fdr/utils"
import { EmptyRow, Panel, Td, Th } from "./ui"

export function CaseList({
  title,
  subtitle,
  records,
  selectedId,
  onSelect,
  statusCell,
  emptyText,
}: {
  title: string
  subtitle?: string
  records: FdrRecord[]
  selectedId?: string
  onSelect: (id: string) => void
  statusCell: (r: FdrRecord) => ReactNode
  emptyText: string
}) {
  return (
    <Panel title={title} subtitle={subtitle} actions={<span className="font-mono text-xs text-muted-foreground">{records.length} file(s)</span>} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>File No.</Th>
              <Th>Institution</Th>
              <Th className="text-right">Principal</Th>
              <Th>Maturity</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? <EmptyRow cols={5} text={emptyText} /> : null}
            {records.map((r) => {
              const d = daysUntil(r.maturityDate)
              const active = r.id === selectedId
              return (
                <tr
                  key={r.id}
                  className={cn("cursor-pointer hover:bg-muted", active && "bg-accent outline-2 -outline-offset-2 outline-saffron")}
                  onClick={() => onSelect(r.id)}
                >
                  <Td className="font-mono text-xs">
                    <button type="button" className="text-left text-primary underline-offset-2 hover:underline" onClick={() => onSelect(r.id)} aria-pressed={active}>
                      {r.fileNo}
                    </button>
                  </Td>
                  <Td>
                    <p className="font-medium leading-tight">{r.institutionName}</p>
                    <p className="text-[11px] text-muted-foreground">{r.city} · {r.course}</p>
                  </Td>
                  <Td className="text-right font-mono">{formatINR(r.principal)}</Td>
                  <Td className={cn("whitespace-nowrap font-mono text-xs", d <= 30 && "font-semibold text-red-700")}>
                    {d > 365 ? `${Math.round(d / 365)} yrs` : d >= 0 ? `T-${d}d` : `+${-d}d past`}
                  </Td>
                  <Td>{statusCell(r)}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export function FileHeader({ r, right }: { r: FdrRecord; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
      <div>
        <p className="font-mono text-xs text-muted-foreground">File No: {r.fileNo} · {r.institutionId}</p>
        <h3 className="text-base font-bold leading-tight">{r.institutionName}</h3>
        <p className="text-xs text-muted-foreground">
          {r.trustName} · {r.city} · {r.region}
        </p>
      </div>
      {right}
    </div>
  )
}
