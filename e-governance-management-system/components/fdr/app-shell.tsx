"use client"

import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import type { Role } from "@/lib/fdr/types"
import { ROLE_META } from "@/lib/fdr/utils"
import { GrievancePortal, VigilancePortal } from "./bureau-portals"
import { FinancePortal } from "./finance-portal"
import { GovFooter, GovHeader, OfficerStrip, PortalBar } from "./gov-header"
import { InstitutionPortal } from "./institution/institution-portal"
import { RoPortal } from "./ro-portal"
import { FdrStoreProvider, PrefsProvider, usePrefs, useFdrStore } from "./store"

const PORTAL_DESC: Record<Role, string> = {
  institution: "Assess required deposit, submit Joint FDR / electronic deposit, and track clearances in real time.",
  ro: "Maker-checker verification of instruments, vault locking, and Approval Bureau NOC for maturing FDRs.",
  grievance: "Dedicated desk for Grievance Officers to issue or withhold Grievance NOC for FDR release.",
  vigilance: "Dedicated desk for Legal / Vigilance Officers – court case & investigation registry clearance.",
  finance: "Final authority – master ledger, maturity alerts, DSC-signed release orders and cryptographic audit trail.",
}

function Portal() {
  const { role, lang, fontScale, highContrast } = usePrefs()
  const { records, audit } = useFdrStore()

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`
  }, [fontScale])
  useEffect(() => {
    document.documentElement.classList.toggle("hc", highContrast)
  }, [highContrast])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const meta = ROLE_META[role]
  const last = audit[audit.length - 1]

  return (
    <div className="flex min-h-screen flex-col">
      <GovHeader />
      <PortalBar />
      <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4 outline-none">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Home</span>
              <ChevronRight className="size-3" aria-hidden />
              <span>Security Deposit</span>
              <ChevronRight className="size-3" aria-hidden />
              <span className="font-semibold text-foreground">{lang === "hi" ? meta.labelHi : meta.label}</span>
            </nav>
            <h2 className="mt-1 text-xl font-bold text-navy">{lang === "hi" ? meta.labelHi : meta.label} Portal</h2>
            <p className="text-sm text-muted-foreground">{PORTAL_DESC[role]}</p>
          </div>
          <div className="rounded-sm border border-border bg-card px-3 py-1.5 text-right font-mono text-[11px] text-muted-foreground">
            <p>Shared ledger: {records.length} files · {audit.length} audit blocks</p>
            <p title={last?.hash}>Head: {last?.hash.slice(0, 20)}…</p>
          </div>
        </div>
        <OfficerStrip />
        {role === "institution" ? <InstitutionPortal /> : null}
        {role === "ro" ? <RoPortal /> : null}
        {role === "grievance" ? <GrievancePortal /> : null}
        {role === "vigilance" ? <VigilancePortal /> : null}
        {role === "finance" ? <FinancePortal /> : null}
      </main>
      <GovFooter />
    </div>
  )
}

export function AppShell() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status">
        <p className="font-mono text-sm text-muted-foreground">Establishing secure session…</p>
      </div>
    )
  }
  return (
    <PrefsProvider>
      <FdrStoreProvider>
        <Portal />
      </FdrStoreProvider>
    </PrefsProvider>
  )
}
