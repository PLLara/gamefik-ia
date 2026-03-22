"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Check, X, Eye, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Aluno } from "@/lib/data"

const AVATAR_MENINO = "/images/avatar-menino.jpeg"
const AVATAR_MENINA = "/images/avatar-menina.jpeg"

function formatFullName(shortName: string): string {
  return shortName
    .replace(/\s([A-Z])\.\s/, (_, l) => ` ${l}. `)
}

interface AlunoCardProps {
  aluno: Aluno
  selected: boolean
  onToggleSelect: () => void
  onEdit?: () => void
  onView?: () => void
}

export function AlunoCard({ aluno, selected, onToggleSelect, onEdit, onView }: AlunoCardProps) {
  const [showPopover, setShowPopover] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)

  function handleNameEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShowPopover(true)
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setShowPopover(false), 200)
  }

  function handlePopoverEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div className="pt-7">
      <div
        onClick={onToggleSelect}
        className={cn(
          "group relative flex h-[88px] flex-col items-center overflow-visible rounded-2xl border p-4 pt-9 transition-all cursor-pointer",
          selected
            ? "border-2 border-ring bg-sidebar-accent"
            : "border-[#E5E5E5] bg-white shadow-card hover:shadow-md"
        )}
      >
        {/* Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors",
              selected
                ? "border-[#4B3786] bg-[#4B3786]"
                : "border-[#D4D4D4] bg-white shadow-checkbox"
            )}
          >
            {selected && <Check className="h-3.5 w-3.5 text-white" />}
          </div>
        </div>

        {/* Avatar - overflows top of card */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-card shadow-sm">
              <Image
                src={aluno.genero === "F" ? AVATAR_MENINA : AVATAR_MENINO}
                alt={aluno.nome}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </div>
            {!aluno.ativo && (
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-destructive">
                <X className="h-2.5 w-2.5 text-destructive-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Name with hover popover trigger */}
        <div className="relative mt-1 w-full">
          <span
            ref={nameRef}
            onMouseEnter={handleNameEnter}
            onMouseLeave={handleLeave}
            className="block w-full text-center text-xs font-medium text-foreground leading-relaxed line-clamp-2 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {formatFullName(aluno.nome)}
          </span>

          {/* Popover */}
          {showPopover && (
            <div
              ref={popoverRef}
              onMouseEnter={handlePopoverEnter}
              onMouseLeave={handleLeave}
              className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-gamefik"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Arrow */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-l border-t border-border bg-card" />

              <div className="relative flex flex-col gap-3">
                {/* Header */}
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {formatFullName(aluno.nome)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Entrou em {aluno.entradaEm}
                  </p>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={cn(
                      "font-medium",
                      aluno.ativo ? "text-emerald-600" : "text-destructive"
                    )}>
                      {aluno.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Engajamento:</span>
                    <span className={cn(
                      "font-medium",
                      aluno.engajamento === "Super engajado" && "text-emerald-600",
                      aluno.engajamento === "Engajado" && "text-amber-600",
                      aluno.engajamento === "Pouco engajado" && "text-destructive",
                    )}>
                      {aluno.engajamento}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Turma:</span>
                    <span className="font-medium text-foreground">{aluno.turmaNome}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPopover(false)
                      onEdit?.()
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPopover(false)
                      onView?.()
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver aluno
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface NovoAlunoCardProps {
  onClick?: () => void
}

export function NovoAlunoCard({ onClick }: NovoAlunoCardProps) {
  return (
    <div className="pt-7">
      <button onClick={onClick} className="relative flex h-[88px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E5E5E5] bg-accent/20 p-4 pt-9 transition-colors hover:bg-accent/40 overflow-visible">
        <div className="absolute -top-7 left-1/2 -translate-x-1/2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border bg-card">
            <span className="text-xl font-light text-muted-foreground">+</span>
          </div>
        </div>
        <span className="mt-1 flex-1 flex items-center text-xs font-medium text-accent-foreground">Novo Aluno</span>
      </button>
    </div>
  )
}
