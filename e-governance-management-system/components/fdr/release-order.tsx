"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { FileSignature, KeyRound, Landmark, Loader2, Printer, X } from "lucide-react"
import type { FdrRecord, ReleaseOrder } from "@/lib/fdr/types"
import { formatDate, formatDateTime, formatINR, ROLE_META, sha256 } from "@/lib/fdr/utils"
import { useFdrStore } from "./store"
import { GovButton, Stamp } from "./ui"

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/70 p-4 print:static print:bg-transparent print:p-0">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-4xl" : "max-w-md"} rounded-sm border border-border bg-card shadow-xl outline-none`}
      >
        <div className="no-print flex items-center justify-between border-b border-border bg-primary px-3 py-2 text-primary-foreground">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-sm p-1 hover:bg-white/10">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function DscSignFlow({ record, onClose }: { record: FdrRecord; onClose: () => void }) {
  const { release, records } = useFdrStore()
  const [token, setToken] = useState("ePass2003 – Class 3 Signing (Smt. P. Lakshmi)")
  const [pin, setPin] = useState("")
  const [signing, setSigning] = useState(false)
  const live = records.find((r) => r.id === record.id) ?? record

  function sign() {
    setSigning(true)
    setTimeout(() => {
      const signedAt = new Date().toISOString()
      const omNo = `F.No. TECH/FIN/SD-REL/${new Date().getFullYear()}/${record.fileNo.split("/").pop()}`
      const dscSerial = sha256(token + signedAt).slice(0, 16).toUpperCase()
      const hash = sha256([omNo, record.fileNo, record.fdrNo, record.principal, signedAt, dscSerial].join("|"))
      const order: ReleaseOrder = {
        omNo,
        signedAt,
        dscSerial,
        signatory: `${ROLE_META.finance.officer}, ${ROLE_META.finance.designation}`,
        hash,
      }
      release(record.id, order)
      setSigning(false)
    }, 1400)
  }

  if (live.releaseOrder) {
    return (
      <Modal title="Official FDR Release Order / Bank Discharge Letter" onClose={onClose} wide>
        <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground">Digitally signed document preview. Use Print to save as PDF.</p>
          <GovButton size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" aria-hidden /> Print / Save as PDF
          </GovButton>
        </div>
        <div className="max-h-[75vh] overflow-y-auto bg-muted p-4 print:max-h-none print:overflow-visible print:p-0">
          <OfficeMemorandum record={live} order={live.releaseOrder} />
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Apply Digital Signature (DSC)" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm">
          You are about to digitally sign the release order for <b>{record.institutionName}</b> ({record.fileNo}) of{" "}
          <b className="font-mono">{formatINR(record.principal)}</b>.
        </p>
        <div className="flex flex-col gap-1">
          <label htmlFor="dsc-token" className="text-xs font-semibold text-muted-foreground">
            DSC Token (USB Crypto Device)
          </label>
          <select
            id="dsc-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="h-9 rounded-sm border border-input bg-card px-2 text-sm"
          >
            <option>ePass2003 – Class 3 Signing (Smt. P. Lakshmi)</option>
            <option>ProxKey – Class 3 Signing (Smt. P. Lakshmi)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dsc-pin" className="text-xs font-semibold text-muted-foreground">
            Token PIN (6 digits)
          </label>
          <input
            id="dsc-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="h-9 rounded-sm border border-input bg-card px-2 font-mono tracking-[0.4em]"
          />
        </div>
        <GovButton variant="success" disabled={pin.length !== 6 || signing} onClick={sign}>
          {signing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
          {signing ? "Signing with PKCS#11 token…" : "Sign & Generate Release Order"}
        </GovButton>
      </div>
    </Modal>
  )
}

export function OfficeMemorandum({ record: r, order }: { record: FdrRecord; order: ReleaseOrder }) {
  return (
    <article id="om-print" className="mx-auto max-w-[800px] border border-border bg-white p-8 font-serif text-[13px] leading-relaxed text-black shadow-sm">
      <header className="border-b-2 border-black pb-3 text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border-2 border-black">
          <Landmark className="size-7" aria-hidden />
        </div>
        <p className="text-sm font-bold uppercase tracking-wider">Government of India</p>
        <p className="font-bold uppercase">Regulatory Authority for Technical Education</p>
        <p className="text-xs">Central Finance & Treasury Division · Security Deposit Cell</p>
      </header>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
        <p className="font-mono font-semibold">{order.omNo}</p>
        <p>Dated: {formatDate(order.signedAt)}</p>
      </div>

      <h3 className="mt-4 text-center text-sm font-bold uppercase underline underline-offset-4">Office Memorandum</h3>
      <p className="mt-1 text-center text-xs font-semibold">
        Subject: Release of Security Deposit FDR and Discharge of Lien – {r.institutionName}, {r.city}
      </p>

      <div className="mt-4 flex flex-col gap-3 text-justify">
        <p>
          1. Reference is invited to the request of <b>{r.trustName}</b> (Institution ID {r.institutionId}) under File No.{" "}
          <span className="font-mono">{r.fileNo}</span> for release of the Security Deposit held as a Joint Fixed Deposit Receipt in
          favour of the Regulatory Authority, upon completion of the mandatory lock-in period.
        </p>
        <p>
          2. Clearances have been received from the Approval Bureau (Regional Office), the Grievance Redressal Cell and the Vigilance &
          Legal Cell. The competent authority has accordingly approved the release of the following instrument:
        </p>
        <table className="w-full border-collapse text-xs">
          <tbody>
            {(
              [
                ["Bank & Branch", `${r.bankName}, ${r.branch}`],
                ["FDR / Instrument No.", r.fdrNo],
                ["Date of Issue", formatDate(r.issueDate)],
                ["Date of Maturity", formatDate(r.maturityDate)],
                ["Principal Amount", formatINR(r.principal)],
              ] as const
            ).map(([k, v]) => (
              <tr key={k}>
                <th scope="row" className="w-1/3 border border-black px-2 py-1 text-left font-semibold">{k}</th>
                <td className="border border-black px-2 py-1 font-mono">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          3. <b>The Branch Manager, {r.bankName}</b>, is hereby requested to vacate the lien marked in favour of the Regulatory Authority
          and release the proceeds of the above FDR, along with accrued interest, to the account of the Trust / Society. This letter
          shall serve as the <b>Bank Discharge Letter</b>.
        </p>
        <p>4. This issues with the approval of the competent authority.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Stamp label="Digitally Signed" sub={formatDateTime(order.signedAt)} tone="blue" />
        <div className="text-right text-xs">
          <div className="mb-1 inline-flex items-center gap-1 rounded-sm border border-green-700 px-2 py-0.5 text-[11px] font-semibold text-green-800">
            <FileSignature className="size-3.5" aria-hidden /> Signature Valid
          </div>
          <p className="font-semibold">({ROLE_META.finance.officer})</p>
          <p>{ROLE_META.finance.designation}</p>
          <p className="font-mono text-[10px]">DSC Serial: {order.dscSerial}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-black pt-2 text-[11px]">
        <p className="font-semibold">To:</p>
        <p>1. The Branch Manager, {r.bankName}, {r.branch}</p>
        <p>2. The Chairman / Secretary, {r.trustName}, {r.city}</p>
        <p className="font-semibold">Copy to: Regional Office · Grievance Redressal Cell · Vigilance & Legal Cell · Guard File</p>
      </div>
      <p className="mt-3 break-all border border-dashed border-black p-2 font-mono text-[10px]">
        Document SHA-256: {order.hash}
      </p>
    </article>
  )
}
