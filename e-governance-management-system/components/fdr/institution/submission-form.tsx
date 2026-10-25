"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, FileScan, Landmark, Loader2, ScanLine, ShieldAlert, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CourseCategory, FdrRecord, PremisesStatus, SubmissionMode, TrustCategory } from "@/lib/fdr/types"
import { addYears, assessDeposit, formatINR, hashSeed, LOCK_IN_YEARS, todayIso } from "@/lib/fdr/utils"
import { useFdrStore } from "../store"
import { GovButton, KV, Panel, SelectField, Stamp, TextField } from "../ui"

const COURSES: CourseCategory[] = ["Engineering", "Management", "Pharmacy", "Polytechnic"]
const TRUSTS: TrustCategory[] = ["General", "Minority"]
const PREMISES: PremisesStatus[] = ["Owned Land", "Leased Building"]
const BANKS = [
  "State Bank of India",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Indian Bank",
  "Bank of India",
]
const OCR_STEPS = [
  "Image pre-processing (deskew, denoise, binarise)",
  "Optical character recognition – text layer extraction",
  "Field parsing – Bank, FDR No., dates, principal, lien",
  "Tamper check – Error Level Analysis & font consistency",
  "MICR / security watermark & joint-holder lien verification",
]

interface OcrFields {
  bankName: string
  fdrNo: string
  issueDate: string
  maturityDate: string
  principal: string
  lienStatus: string
}

const today = todayIso

export function SubmissionForm({ onSubmitted }: { onSubmitted: (id: string) => void }) {
  const { submit, records } = useFdrStore()
  const [course, setCourse] = useState<CourseCategory>("Engineering")
  const [trust, setTrust] = useState<TrustCategory>("General")
  const [premises, setPremises] = useState<PremisesStatus>("Owned Land")
  const [instName, setInstName] = useState("")
  const [trustName, setTrustName] = useState("")
  const [city, setCity] = useState("")
  const [mode, setMode] = useState<SubmissionMode>("Joint FDR Bond")

  const [fdrFile, setFdrFile] = useState<File | null>(null)
  const [fdrPreview, setFdrPreview] = useState<string | null>(null)
  const [affidavit, setAffidavit] = useState<File | null>(null)
  const [ocrStep, setOcrStep] = useState(-1)
  const [ocr, setOcr] = useState<OcrFields | null>(null)
  const [confidence, setConfidence] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const [utr, setUtr] = useState("")
  const [remitBank, setRemitBank] = useState(BANKS[0])
  const [remitAmount, setRemitAmount] = useState("")
  const [utrState, setUtrState] = useState<"idle" | "checking" | "ok" | "fail">("idle")
  const [error, setError] = useState<string | null>(null)

  const assessment = assessDeposit(course, trust, premises)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (!fdrFile || !fdrFile.type.startsWith("image/")) {
      setFdrPreview(null)
      return
    }
    const url = URL.createObjectURL(fdrFile)
    setFdrPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [fdrFile])

  const ocrRunning = ocrStep >= 0 && ocrStep < OCR_STEPS.length
  const ocrDone = ocrStep === OCR_STEPS.length

  function runOcr() {
    if (!fdrFile) return
    timers.current.forEach(clearTimeout)
    setOcr(null)
    setOcrStep(0)
    OCR_STEPS.forEach((_, i) => {
      timers.current.push(setTimeout(() => setOcrStep(i + 1), 650 * (i + 1)))
    })
    timers.current.push(
      setTimeout(() => {
        const h = hashSeed(fdrFile.name + fdrFile.size)
        const issue = today()
        setOcr({
          bankName: BANKS[h % BANKS.length],
          fdrNo: `FDR/${String(h).slice(0, 4)}/${String(h * 7).slice(-8).padStart(8, "0")}`,
          issueDate: issue,
          maturityDate: addYears(issue, LOCK_IN_YEARS),
          principal: String(assessment.total),
          lienStatus: "Lien marked in favour of Regulatory Authority",
        })
        setConfidence(90 + (h % 90) / 10)
      }, 650 * OCR_STEPS.length),
    )
  }

  function verifyUtr() {
    setUtrState("checking")
    timers.current.push(
      setTimeout(() => setUtrState(/^[A-Z]{4}[A-Z0-9]{12,18}$/.test(utr.trim().toUpperCase()) ? "ok" : "fail"), 1200),
    )
  }

  function handleSubmit() {
    setError(null)
    if (!instName.trim() || !trustName.trim() || !city.trim()) {
      return setError("Please furnish Institution name, Trust / Society name and City.")
    }
    let fields: Pick<FdrRecord, "bankName" | "branch" | "fdrNo" | "issueDate" | "maturityDate" | "principal" | "lienStatus">
    let extra: Partial<FdrRecord> = {}
    if (mode === "Joint FDR Bond") {
      if (!fdrFile || !affidavit) return setError("Upload both the scanned Joint FDR bond and the notarised Affidavit.")
      if (!ocr) return setError("Run OCR & Tamper Check before submission.")
      const principal = Number(ocr.principal)
      if (!Number.isFinite(principal) || principal < assessment.total) {
        return setError(`FDR principal must be at least ${formatINR(assessment.total)} as per assessment.`)
      }
      fields = {
        bankName: ocr.bankName,
        branch: "As per FDR instrument",
        fdrNo: ocr.fdrNo,
        issueDate: ocr.issueDate,
        maturityDate: ocr.maturityDate,
        principal,
        lienStatus: ocr.lienStatus,
      }
      extra = {
        scanUrl: fdrPreview ? URL.createObjectURL(fdrFile) : "/images/fdr-bond-scan.png",
        scanName: fdrFile.name,
        ocrConfidence: Number(confidence.toFixed(1)),
        tamperCheck: "Passed",
      }
    } else {
      if (utrState !== "ok") return setError("Verify the UTR number with the remittance gateway before submission.")
      const amt = Number(remitAmount)
      if (!Number.isFinite(amt) || amt < assessment.total) {
        return setError(`Remitted amount must be at least ${formatINR(assessment.total)}.`)
      }
      fields = {
        bankName: `${remitBank} (RTGS/NEFT)`,
        branch: "Escrow Account – Regulatory Authority",
        fdrNo: `E-DEP/${new Date().getFullYear()}/${records.length + 1}`,
        issueDate: today(),
        maturityDate: addYears(today(), LOCK_IN_YEARS),
        principal: amt,
        lienStatus: "Held in Escrow (Regulatory Authority)",
      }
      extra = { utrNo: utr.trim().toUpperCase(), tamperCheck: "Not Run" }
    }

    const maxNo = Math.max(...records.map((r) => Number(r.fileNo.split("/").pop()) || 0))
    const id = `r${Date.now()}`
    const record: FdrRecord = {
      id,
      fileNo: `TECH/FDR/${new Date().getFullYear()}/${String(maxNo + 1).padStart(5, "0")}`,
      institutionId: `INST-NEW-${String(hashSeed(instName)).slice(0, 7)}`,
      institutionName: instName.trim(),
      trustName: trustName.trim(),
      city: city.trim(),
      state: "—",
      region: "Regional Office (Jurisdictional)",
      course,
      trustCategory: trust,
      premises,
      requiredAmount: assessment.total,
      mode,
      ...fields,
      tamperCheck: "Not Run",
      ...extra,
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
        {
          id: `inst-${id}`,
          role: "institution",
          officer: "Authorised Signatory",
          designation: trustName.trim(),
          remark:
            mode === "Joint FDR Bond"
              ? `Joint FDR bond (${fields.fdrNo}) with affidavit submitted for ${course} – ${premises}.`
              : `Electronic deposit of ${formatINR(fields.principal)} remitted. UTR ${extra.utrNo}.`,
          at: new Date().toISOString(),
        },
      ],
      submittedAt: new Date().toISOString(),
    }
    submit(record)
    onSubmitted(id)
    setInstName("")
    setTrustName("")
    setCity("")
    setFdrFile(null)
    setAffidavit(null)
    setOcr(null)
    setOcrStep(-1)
    setUtr("")
    setUtrState("idle")
    setRemitAmount("")
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Dynamic Deposit Assessment Calculator" subtitle="Security deposit assessed as per prevailing approval norms">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField id="course" label="Course Category" value={course} onChange={(v) => setCourse(v as CourseCategory)} options={COURSES} />
            <SelectField id="trust" label="Trust Category" value={trust} onChange={(v) => setTrust(v as TrustCategory)} options={TRUSTS} />
            <SelectField id="premises" label="Premises Status" value={premises} onChange={(v) => setPremises(v as PremisesStatus)} options={PREMISES} />
            <div className="sm:col-span-3">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr className="border border-border">
                    <th scope="row" className="bg-muted px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Base deposit ({course})</th>
                    <td className="px-2 py-1.5 text-right font-mono">{formatINR(assessment.base)}</td>
                  </tr>
                  <tr className="border border-border">
                    <th scope="row" className="bg-muted px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Trust factor ({trust})</th>
                    <td className="px-2 py-1.5 text-right font-mono">× {trust === "Minority" ? "0.75" : "1.00"} = {formatINR(assessment.afterTrust)}</td>
                  </tr>
                  <tr className="border border-border">
                    <th scope="row" className="bg-muted px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Premises factor ({premises})</th>
                    <td className={cn("px-2 py-1.5 text-right font-mono", premises === "Leased Building" && "font-semibold text-red-700")}>
                      × {premises === "Leased Building" ? "2.00 (doubled)" : "1.00"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-sm border-2 border-primary bg-secondary p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Required Security Deposit</p>
            <p className="mt-1 font-mono text-3xl font-bold text-primary">{formatINR(assessment.total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Lock-in period: {LOCK_IN_YEARS} years · Joint name with Regulatory Authority</p>
          </div>
        </div>
      </Panel>

      <Panel title="Security Deposit Submission" subtitle="Choose the mode of deposit">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField id="inst-name" label="Institution Name" value={instName} onChange={setInstName} placeholder="e.g. Sardar Patel Institute of Technology" />
          <TextField id="trust-name" label="Trust / Society Name" value={trustName} onChange={setTrustName} placeholder="Registered Trust / Society" />
          <TextField id="city" label="City" value={city} onChange={setCity} placeholder="City / District" />
        </div>

        <div role="tablist" aria-label="Submission mode" className="mt-4 flex border-b border-border">
          {(["Joint FDR Bond", "Electronic Deposit"] as SubmissionMode[]).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "-mb-px flex items-center gap-2 border border-b-0 px-3 py-2 text-sm font-medium",
                mode === m ? "rounded-t-sm border-border bg-card text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "Joint FDR Bond" ? <FileScan className="size-4" aria-hidden /> : <Landmark className="size-4" aria-hidden />}
              {m === "Joint FDR Bond" ? "(a) Legacy Joint FDR Bond Upload" : "(b) Direct Electronic Deposit (RTGS/NEFT)"}
            </button>
          ))}
        </div>

        {mode === "Joint FDR Bond" ? (
          <div className="grid gap-4 border border-t-0 border-border p-3 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <FileDrop id="fdr-file" label="Scanned Joint FDR Bond (JPG / PNG / PDF)" file={fdrFile} onFile={(f) => { setFdrFile(f); setOcr(null); setOcrStep(-1) }} />
              <FileDrop id="affidavit-file" label="Notarised Affidavit (PDF)" file={affidavit} onFile={setAffidavit} />
              <GovButton onClick={runOcr} disabled={!fdrFile || ocrRunning}>
                {ocrRunning ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ScanLine className="size-4" aria-hidden />}
                Run OCR & Tamper Check
              </GovButton>
              {ocrStep >= 0 ? (
                <ol className="flex flex-col gap-1 rounded-sm border border-border bg-muted p-2 text-xs" aria-live="polite">
                  {OCR_STEPS.map((s, i) => (
                    <li key={s} className="flex items-center gap-2">
                      {i < ocrStep ? (
                        <CheckCircle2 className="size-3.5 text-green-700" aria-hidden />
                      ) : i === ocrStep ? (
                        <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
                      ) : (
                        <span className="size-3.5 rounded-full border border-border" aria-hidden />
                      )}
                      <span className={i < ocrStep ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-dashed border-input bg-muted">
                {fdrPreview ? (
                  <img src={fdrPreview} alt="Uploaded FDR bond preview" className="size-full object-contain" />
                ) : fdrFile ? (
                  <p className="px-4 text-center text-xs text-muted-foreground">
                    <FileScan className="mx-auto mb-1 size-8" aria-hidden />
                    {fdrFile.name} ({Math.round(fdrFile.size / 1024)} KB) – PDF preview rendered at RO desk
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Scan preview will appear here</p>
                )}
              </div>
              {ocr && ocrDone ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Extracted Fields (editable) · Confidence {confidence.toFixed(1)}%
                    </p>
                    <Stamp label="Tamper Check Passed" tone="green" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <TextField id="ocr-bank" label="Bank Name" value={ocr.bankName} onChange={(v) => setOcr({ ...ocr, bankName: v })} />
                    <TextField id="ocr-fdr" label="FDR No." mono value={ocr.fdrNo} onChange={(v) => setOcr({ ...ocr, fdrNo: v })} />
                    <TextField id="ocr-issue" label="Issue Date" type="date" value={ocr.issueDate} onChange={(v) => setOcr({ ...ocr, issueDate: v, maturityDate: addYears(v, LOCK_IN_YEARS) })} />
                    <TextField id="ocr-maturity" label={`Maturity Date (${LOCK_IN_YEARS}-yr lock-in)`} type="date" value={ocr.maturityDate} onChange={(v) => setOcr({ ...ocr, maturityDate: v })} />
                    <TextField id="ocr-principal" label="Principal Amount (₹)" mono value={ocr.principal} onChange={(v) => setOcr({ ...ocr, principal: v.replace(/[^\d]/g, "") })} />
                    <TextField id="ocr-lien" label="Lien Status" value={ocr.lienStatus} onChange={(v) => setOcr({ ...ocr, lienStatus: v })} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 border border-t-0 border-border p-3 lg:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField id="remit-bank" label="Remitting Bank" value={remitBank} onChange={setRemitBank} options={BANKS} />
              <TextField id="remit-amt" label="Amount Remitted (₹)" mono value={remitAmount} onChange={(v) => setRemitAmount(v.replace(/[^\d]/g, ""))} placeholder={String(assessment.total)} />
              <div className="sm:col-span-2">
                <TextField id="utr" label="UTR / Transaction Reference No." mono value={utr} onChange={(v) => { setUtr(v.toUpperCase()); setUtrState("idle") }} placeholder="e.g. SBINR52026102500418827" />
              </div>
              <GovButton onClick={verifyUtr} disabled={!utr || utrState === "checking"} variant="secondary" className="sm:col-span-2">
                {utrState === "checking" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Landmark className="size-4" aria-hidden />}
                Verify UTR with Remittance Gateway
              </GovButton>
            </div>
            <div className="flex flex-col gap-2">
              <KV
                rows={[
                  ["Beneficiary", "Regulatory Authority – Security Deposit Escrow"],
                  ["Account No.", <span key="a" className="font-mono">3920XXXX4471</span>],
                  ["IFSC", <span key="i" className="font-mono">RBIS0EKUBER</span>],
                  ["Amount Due", <span key="d" className="font-mono font-semibold">{formatINR(assessment.total)}</span>],
                ]}
              />
              <div aria-live="polite">
                {utrState === "ok" ? (
                  <p className="flex items-center gap-2 rounded-sm border border-green-600 bg-green-50 px-2 py-1.5 text-xs text-green-800">
                    <CheckCircle2 className="size-4" aria-hidden /> UTR verified – credit confirmed in escrow account.
                  </p>
                ) : utrState === "fail" ? (
                  <p className="flex items-center gap-2 rounded-sm border border-red-500 bg-red-50 px-2 py-1.5 text-xs text-red-800">
                    <ShieldAlert className="size-4" aria-hidden /> UTR not found. Format: 4-letter bank code followed by 12–18 alphanumerics.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 rounded-sm border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            By submitting, the Authorised Signatory certifies that the information furnished is true and the instrument is genuine.
          </p>
          <GovButton variant="success" onClick={handleSubmit}>
            <Upload className="size-4" aria-hidden />
            Submit to Regional Office
          </GovButton>
        </div>
      </Panel>
    </div>
  )
}

function FileDrop({ id, label, file, onFile }: { id: string; label: string; file: File | null; onFile: (f: File | null) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-input bg-card px-3 py-2.5 text-sm hover:bg-muted"
      >
        <Upload className="size-4 text-primary" aria-hidden />
        <span className={cn("truncate", file ? "font-medium" : "text-muted-foreground")}>
          {file ? `${file.name} · ${Math.round(file.size / 1024)} KB` : "Choose file…"}
        </span>
      </label>
      <input
        id={id}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
