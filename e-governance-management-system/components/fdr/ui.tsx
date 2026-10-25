"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { NocStatus, NoteSheetEntry, Stage } from "@/lib/fdr/types"
import { formatDateTime } from "@/lib/fdr/utils"

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("rounded-sm border border-border bg-card shadow-xs", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary px-3 py-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary-foreground">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("p-3", bodyClassName)}>{children}</div>
    </section>
  )
}

type Variant = "primary" | "secondary" | "success" | "danger" | "warning" | "ghost"

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 border-primary",
  secondary: "bg-card text-secondary-foreground hover:bg-secondary border-input",
  success: "bg-success text-white hover:bg-success/90 border-success",
  danger: "bg-destructive text-white hover:bg-destructive/90 border-destructive",
  warning: "bg-warning text-white hover:bg-warning/90 border-warning",
  ghost: "bg-transparent text-primary hover:bg-secondary border-transparent",
}

export function GovButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-sm border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  )
}

const NOC_TONE: Record<NocStatus, string> = {
  "Not Initiated": "border-slate-300 bg-slate-50 text-slate-600",
  Pending: "border-amber-400 bg-amber-50 text-amber-800",
  Cleared: "border-green-600 bg-green-50 text-green-800",
  "On Hold": "border-red-500 bg-red-50 text-red-800",
  "Forfeiture Recommended": "border-red-800 bg-red-100 text-red-900",
}

export function NocBadge({ status }: { status: NocStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        NOC_TONE[status],
      )}
    >
      {status}
    </span>
  )
}

const STAGE_TONE: Record<Stage, string> = {
  Submitted: "border-blue-500 bg-blue-50 text-blue-800",
  "Deficiency Raised": "border-red-500 bg-red-50 text-red-800",
  Vaulted: "border-indigo-600 bg-indigo-50 text-indigo-800",
  "Release Requested": "border-amber-500 bg-amber-50 text-amber-800",
  Released: "border-green-600 bg-green-50 text-green-800",
  Forfeited: "border-red-800 bg-red-100 text-red-900",
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STAGE_TONE[stage],
      )}
    >
      {stage}
    </span>
  )
}

export function Stamp({ label, sub, tone = "green" }: { label: string; sub?: string; tone?: "green" | "red" | "blue" }) {
  const color =
    tone === "green"
      ? "border-green-700 text-green-700"
      : tone === "red"
        ? "border-red-700 text-red-700"
        : "border-blue-800 text-blue-800"
  return (
    <div
      className={cn(
        "inline-flex -rotate-3 flex-col items-center rounded-sm border-[3px] border-double px-3 py-1 font-mono uppercase",
        color,
      )}
      aria-label={`Stamp: ${label}`}
    >
      <span className="text-xs font-bold tracking-[0.2em]">{label}</span>
      {sub ? <span className="text-[10px] tracking-wider">{sub}</span> : null}
    </div>
  )
}

export function KV({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-border last:border-0">
            <th scope="row" className="w-2/5 bg-muted px-2 py-1.5 text-left align-top text-xs font-medium text-muted-foreground">
              {k}
            </th>
            <td className="px-2 py-1.5 align-top">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function NoteSheet({ entries, children }: { entries: NoteSheetEntry[]; children?: ReactNode }) {
  return (
    <div className="rounded-sm border border-notesheet-border bg-notesheet">
      <div className="flex items-center justify-between border-b border-notesheet-border px-3 py-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-green-900">e-Office Note-Sheet</span>
        <span className="font-mono text-[11px] text-green-900">{entries.length} note(s)</span>
      </div>
      <ol className="max-h-64 divide-y divide-notesheet-border/60 overflow-y-auto">
        {entries.map((n, i) => (
          <li key={n.id} className="px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[11px] text-green-900">
              <span className="font-semibold">
                Note #{i + 1} · {n.officer}, {n.designation}
              </span>
              <span className="font-mono">{formatDateTime(n.at)}</span>
            </div>
            <p className="mt-1 font-mono text-[13px] leading-relaxed text-green-950">{n.remark}</p>
          </li>
        ))}
        {entries.length === 0 ? <li className="px-3 py-2 text-xs text-green-900">No notes recorded.</li> : null}
      </ol>
      {children ? <div className="border-t border-notesheet-border p-3">{children}</div> : null}
    </div>
  )
}

export function RemarkBox({
  value,
  onChange,
  id,
  label = "Note-Sheet Remark (mandatory)",
  placeholder = "Record your formal observation for the file…",
}: {
  value: string
  onChange: (v: string) => void
  id: string
  label?: string
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-green-900">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-sm border border-notesheet-border bg-white px-2 py-1.5 font-mono text-[13px] text-green-950 placeholder:text-green-900/50 focus:outline-2 focus:outline-green-700"
      />
    </div>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-sm border border-border border-l-4 border-l-primary bg-card px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-sm border border-input bg-card px-2 text-sm focus:outline-2 focus:outline-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  mono,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 rounded-sm border border-input bg-card px-2 text-sm focus:outline-2 focus:outline-ring",
          mono && "font-mono",
        )}
      />
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border border-border bg-primary px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-primary-foreground",
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border border-border px-2 py-1.5 align-top text-[13px]", className)}>{children}</td>
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="border border-border px-2 py-6 text-center text-sm text-muted-foreground">
        {text}
      </td>
    </tr>
  )
}
