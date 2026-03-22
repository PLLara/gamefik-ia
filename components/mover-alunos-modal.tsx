"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { X, ChevronDown, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Aluno, Turma } from "@/lib/data"
import { gerarTurmas } from "@/lib/data"

const AVATAR_MENINO = "/images/avatar-menino.jpeg"
const AVATAR_MENINA = "/images/avatar-menina.jpeg"

interface MoverAlunosModalProps {
  alunos: Aluno[]
  turmaAtualId: string
  onClose: () => void
  onConfirm?: (alunoIds: string[], novaTurmaId: string) => void
}

export function MoverAlunosModal({
  alunos,
  turmaAtualId,
  onClose,
  onConfirm,
}: MoverAlunosModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null)
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false)

  const allTurmas = useMemo(() => gerarTurmas(), [])
  
  // Filter out current turma from options
  const turmasDisponiveis = useMemo(
    () => allTurmas.filter((t) => t.id !== turmaAtualId),
    [allTurmas, turmaAtualId]
  )

  const filteredTurmas = useMemo(() => {
    if (!searchQuery.trim()) return turmasDisponiveis
    return turmasDisponiveis.filter((t) =>
      t.nome.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [turmasDisponiveis, searchQuery])

  const selectedTurma = turmasDisponiveis.find((t) => t.id === selectedTurmaId)

  const isValid = selectedTurmaId !== null

  function handleConfirm() {
    if (isValid && selectedTurmaId && onConfirm) {
      onConfirm(
        alunos.map((a) => a.id),
        selectedTurmaId
      )
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-gamefik max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Mover {alunos.length === 1 ? "aluno" : "alunos"} de turma
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6 overflow-auto">
          {/* Selected students preview */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              {alunos.length === 1 ? "Aluno selecionado" : `Alunos selecionados (${alunos.length})`}
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-auto rounded-xl border border-border bg-muted/30 p-3">
              {alunos.map((aluno) => (
                <div
                  key={aluno.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1"
                >
                  <div className="h-6 w-6 overflow-hidden rounded-full border border-border">
                    <Image
                      src={aluno.genero === "F" ? AVATAR_MENINA : AVATAR_MENINO}
                      alt={aluno.nome}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {aluno.nome.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Turma atual info */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Turma atual:</span>
            <span className="text-sm font-semibold text-foreground">
              {alunos[0]?.turmaNome}
            </span>
          </div>

          {/* Nova turma dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Selecionar nova turma
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTurmaDropdown(!showTurmaDropdown)}
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-xl border bg-card px-4 text-sm transition-colors",
                  selectedTurma ? "text-foreground" : "text-muted-foreground",
                  showTurmaDropdown
                    ? "border-ring ring-2 ring-ring/30"
                    : "border-border"
                )}
              >
                {selectedTurma?.nome || "Selecione a turma de destino"}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    showTurmaDropdown && "rotate-180"
                  )}
                />
              </button>

              {showTurmaDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTurmaDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-gamefik">
                    {/* Search inside dropdown */}
                    <div className="border-b border-border p-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar turma..."
                          className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Turma list */}
                    <div className="max-h-48 overflow-auto p-1.5">
                      {filteredTurmas.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          Nenhuma turma encontrada.
                        </p>
                      ) : (
                        filteredTurmas.map((turma) => (
                          <button
                            key={turma.id}
                            onClick={() => {
                              setSelectedTurmaId(turma.id)
                              setShowTurmaDropdown(false)
                              setSearchQuery("")
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                              selectedTurmaId === turma.id
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <span>{turma.nome}</span>
                            {selectedTurmaId === turma.id && (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Info message */}
          {selectedTurma && (
            <div className="rounded-xl border border-sidebar-accent bg-sidebar-accent/30 p-3">
              <p className="text-sm text-foreground">
                {alunos.length === 1 ? (
                  <>
                    <span className="font-semibold">{alunos[0].nome.split(" ")[0]}</span> sera
                    movido para <span className="font-semibold">{selectedTurma.nome}</span>.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{alunos.length} alunos</span> serao movidos
                    para <span className="font-semibold">{selectedTurma.nome}</span>.
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              isValid
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Mover {alunos.length === 1 ? "aluno" : "alunos"}
          </button>
        </div>
      </div>
    </div>
  )
}
