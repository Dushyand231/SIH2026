"use client"

import { useEffect, useState } from "react"
import { Building2, Clock, Gavel, Landmark, MessageSquareWarning, ShieldCheck, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/fdr/types"
import { ROLE_META } from "@/lib/fdr/utils"
import { usePrefs } from "./store"

const ROLES: Role[] = ["institution", "ro", "grievance", "vigilance", "finance"]
const ROLE_ICON: Record<Role, typeof Building2> = {
  institution: Building2,
  ro: ShieldCheck,
  grievance: MessageSquareWarning,
  vigilance: Gavel,
  finance: Wallet,
}

function DigitalClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="flex items-center gap-2 rounded-sm border border-border bg-muted px-2 py-1" aria-live="off">
      <Clock className="size-4 text-primary" aria-hidden />
      <div className="leading-tight">
        <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {now ? now.toLocaleTimeString("en-GB", { hour12: false }) : "--:--:--"}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {now ? now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "\u00a0"}{" "}
          IST
        </p>
      </div>
    </div>
  )
}

function UtilityStrip() {
  const { fontScale, setFontScale, highContrast, setHighContrast, lang, setLang, t } = usePrefs()
  const linkCls = "hover:underline focus-visible:outline-1 focus-visible:outline-white"
  return (
    <div className="no-print bg-navy text-[12px] text-slate-200">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1">
        <p className="hidden sm:block">{t("Government e-Governance Portal", "सरकारी ई-गवर्नेंस पोर्टल")}</p>
        <nav aria-label="Accessibility" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href="#main-content" className={linkCls}>
            {t("Skip to Main Content", "मुख्य सामग्री पर जाएं")}
          </a>
          <span aria-hidden className="text-slate-500">|</span>
          <a href="#main-content" className={linkCls}>
            {t("Screen Reader Access", "स्क्रीन रीडर एक्सेस")}
          </a>
          <span aria-hidden className="text-slate-500">|</span>
          <span className="flex items-center gap-1">
            <span>{t("Text Size:", "पाठ आकार:")}</span>
            {[
              { l: "A-", v: 90, n: "Decrease text size" },
              { l: "A", v: 100, n: "Normal text size" },
              { l: "A+", v: 112, n: "Increase text size" },
            ].map((b) => (
              <button
                key={b.l}
                type="button"
                aria-label={b.n}
                aria-pressed={fontScale === b.v}
                onClick={() => setFontScale(b.v)}
                className={cn(
                  "min-w-6 rounded-sm border border-slate-600 px-1 font-semibold",
                  fontScale === b.v ? "bg-white text-navy" : "hover:bg-slate-700",
                )}
              >
                {b.l}
              </button>
            ))}
          </span>
          <span aria-hidden className="text-slate-500">|</span>
          <button
            type="button"
            aria-pressed={highContrast}
            onClick={() => setHighContrast(!highContrast)}
            className={cn("rounded-sm px-1", highContrast ? "bg-yellow-300 text-black" : "hover:underline")}
          >
            {t("High Contrast", "उच्च कंट्रास्ट")}
          </button>
          <span aria-hidden className="text-slate-500">|</span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              lang="en"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
              className={cn("px-1", lang === "en" ? "font-bold text-white underline" : "hover:underline")}
            >
              English
            </button>
            <span aria-hidden>/</span>
            <button
              type="button"
              lang="hi"
              aria-pressed={lang === "hi"}
              onClick={() => setLang("hi")}
              className={cn("px-1", lang === "hi" ? "font-bold text-white underline" : "hover:underline")}
            >
              हिन्दी
            </button>
          </span>
        </nav>
      </div>
    </div>
  )
}

export function GovHeader() {
  const { role, setRole, t, lang } = usePrefs()
  const meta = ROLE_META[role]
  const Icon = ROLE_ICON[role]

  return (
    <>
      <UtilityStrip />
      <header className="no-print border-b-4 tricolor-border bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-amber-50">
              <Landmark className="size-8 text-navy" aria-hidden />
              <span className="sr-only">Government emblem</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                {t("Government of India · e-Governance", "भारत सरकार · ई-गवर्नेंस")}
              </p>
              <h1 className="text-balance text-base font-bold leading-tight text-navy sm:text-lg">
                {t(
                  "National Technical Education Security Deposit & FDR Lifecycle Management System",
                  "राष्ट्रीय तकनीकी शिक्षा प्रतिभूति जमा एवं एफडीआर जीवनचक्र प्रबंधन प्रणाली",
                )}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Assessment · Verification · Vaulting · Maturity · Multi-Bureau NOC · Release",
                  "मूल्यांकन · सत्यापन · भंडारण · परिपक्वता · बहु-ब्यूरो एनओसी · विमोचन",
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-sm border border-green-700 bg-green-50 px-2 py-1">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-green-600" />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-green-800">
                  {t("Active Role", "सक्रिय भूमिका")}
                </p>
                <p className="flex items-center gap-1 text-xs font-semibold text-green-950">
                  <Icon className="size-3.5" aria-hidden />
                  {lang === "hi" ? meta.labelHi : meta.label}
                </p>
              </div>
            </div>
            <DigitalClock />
            <div className="flex flex-col gap-0.5">
              <label htmlFor="role-switch" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Switch Portal / Role", "पोर्टल / भूमिका बदलें")}
              </label>
              <select
                id="role-switch"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-8 rounded-sm border border-input bg-card px-2 text-sm font-medium focus:outline-2 focus:outline-ring"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {lang === "hi" ? ROLE_META[r].labelHi : ROLE_META[r].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export function PortalBar() {
  const { role, setRole, lang, t } = usePrefs()
  return (
    <nav aria-label={t("Departmental portals", "विभागीय पोर्टल")} className="no-print border-b border-border bg-primary">
      <div className="mx-auto flex max-w-[1400px] items-stretch gap-0 overflow-x-auto px-4">
        <span className="hidden shrink-0 items-center pr-3 text-[11px] font-semibold uppercase tracking-widest text-primary-foreground/70 lg:flex">
          {t("Portal Login", "पोर्टल लॉगिन")}
        </span>
        {ROLES.map((r, i) => {
          const Icon = ROLE_ICON[r]
          const active = r === role
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-2.5 text-left text-[13px] font-medium transition-colors",
                active
                  ? "border-saffron bg-white/10 text-white"
                  : "border-transparent text-primary-foreground/80 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="flex size-5 items-center justify-center rounded-sm bg-white/15 font-mono text-[10px]">
                {i + 1}
              </span>
              <Icon className="size-4" aria-hidden />
              <span className="whitespace-nowrap">{lang === "hi" ? ROLE_META[r].labelHi : ROLE_META[r].label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function OfficerStrip() {
  const { role, t } = usePrefs()
  const meta = ROLE_META[role]
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-card px-3 py-2 text-xs">
      <p>
        <span className="text-muted-foreground">{t("Logged in as", "लॉग इन")}: </span>
        <span className="font-semibold">{meta.officer}</span>
        <span className="text-muted-foreground"> · {meta.designation}</span>
      </p>
      <p className="font-mono text-muted-foreground">
        {t("Session", "सत्र")}: {meta.code}-SSO-{role === "institution" ? "TRUST" : "e-OFFICE"} · {t("Secure", "सुरक्षित")} TLS 1.3
      </p>
    </div>
  )
}

export function GovFooter() {
  return (
    <footer className="no-print mt-8 border-t-4 tricolor-border bg-navy text-slate-300">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs">
        <p>Content owned and maintained by the Regulatory Authority for Technical Education. Designed as per GIGW guidelines.</p>
        <p className="font-mono">Version 3.2.0 · Last updated: {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}
