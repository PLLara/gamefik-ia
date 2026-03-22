"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Turma } from "@/lib/data"

interface TurmaCardProps {
  turma: Turma
  selected: boolean
  selectionMode: boolean
  onToggleSelect: () => void
}

export function TurmaCard({ turma, selected, selectionMode, onToggleSelect }: TurmaCardProps) {
  const router = useRouter()

  function handleCardClick() {
    if (selectionMode) {
      onToggleSelect()
    } else {
      router.push(`/turmas/${turma.id}`)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center rounded-2xl border p-4 transition-all cursor-pointer",
        selected
          ? "border-2 border-ring bg-sidebar-accent"
          : "border-[#E5E5E5] bg-white shadow-card hover:shadow-md"
      )}
    >
      {selectionMode && (
        <div className="absolute top-2.5 left-2.5">
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
      )}

      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <span className="text-lg font-bold text-muted-foreground">{turma.sigla}</span>
      </div>

      {selectionMode ? (
        <span className="mt-2 flex items-center gap-0.5 text-sm font-medium text-foreground">
          {turma.nome}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      ) : (
        <Link
          href={`/turmas/${turma.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center gap-0.5 text-sm font-medium text-foreground hover:underline"
        >
          {turma.nome}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}

      <span className="mt-0.5 text-xs text-muted-foreground">
        {turma.totalAlunos} alunos
      </span>
    </div>
  )
}

interface NovaTurmaCardProps {
  onClick?: () => void
}

export function NovaTurmaCard({ onClick }: NovaTurmaCardProps) {
  return (
    <button onClick={onClick} className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E5E5E5] bg-accent/20 p-4 transition-colors hover:bg-accent/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border">
        <span className="text-xl font-light text-muted-foreground">+</span>
      </div>
      <span className="mt-2 text-sm font-medium text-accent-foreground">Nova Turma</span>
    </button>
  )
}
