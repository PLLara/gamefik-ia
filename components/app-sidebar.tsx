"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Building2,
  ChevronDown,
  HelpCircle,
  Copy,
  Check,
  MessageCircle,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/sidebar-context"

const SCHOOL_CODE = "GFK-2024-RM"

const navItems = [
  { label: "Chat IA", href: "/", icon: MessageCircle },
]

const bottomItems = [
  { label: "Ajuda", href: "/ajuda", icon: HelpCircle },
]



export function AppSidebar() {
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)
  
  const { collapsed, toggle } = useSidebar()

  function handleCopyCode() {
    navigator.clipboard.writeText(SCHOOL_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[220px]"
      )}
    >
      {/* Brand + Toggle */}
      <div className={cn(
        "flex items-center py-5 transition-all",
        collapsed ? "justify-center px-2" : "justify-between px-5"
      )}>
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <Image
            src="https://manager.gamefik.com/icon.png"
            alt="Gamefik"
            width={32}
            height={32}
            className="shrink-0"
          />
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight text-sidebar-foreground font-heading">
              gamefik
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={toggle}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Recolher sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapsed: Toggle button below logo */}
      {collapsed && (
        <div className="flex justify-center px-2 pb-3">
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Expandir sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Unit selector + school code + quick actions (hidden when collapsed) */}
      {!collapsed && (
        <div className="flex flex-col gap-2 px-4 pb-4">
          <button className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-col items-start text-left">
              <span className="text-[11px] text-muted-foreground leading-none">Unidade</span>
              <span className="text-sm font-medium leading-tight">Rosa Mistica</span>
            </div>
            <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={handleCopyCode}
            className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent transition-colors"
            title="Copiar codigo da escola"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className={cn("font-mono tracking-wide", copied && "text-sidebar-primary font-medium")}>
              {copied ? "Copiado!" : SCHOOL_CODE}
            </span>
          </button>


        </div>
      )}



      {/* Navigation */}
      <nav className={cn("flex flex-1 flex-col gap-0.5", collapsed ? "items-center px-2" : "px-3")}>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "h-10 w-10 justify-center" : "gap-2.5 px-3 py-2",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 shrink-0",
                isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground"
              )} />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom links */}
      <div className={cn(
        "flex flex-col gap-0.5 border-t border-sidebar-border py-3",
        collapsed ? "items-center px-2" : "px-3"
      )}>
        {bottomItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
              collapsed ? "h-10 w-10 justify-center" : "gap-2.5 px-3 py-2"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            {!collapsed && item.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
