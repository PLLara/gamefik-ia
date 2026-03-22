"use client"

import { useState, useMemo } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Aluno } from "@/lib/data"

interface EditarAlunoModalProps {
  aluno: Aluno
  onClose: () => void
  onSave?: (data: { nome: string; sobrenome: string }) => void
}

export function EditarAlunoModal({ aluno, onClose, onSave }: EditarAlunoModalProps) {
  // Split the full name into first name and last name
  const nameParts = aluno.nome.split(" ")
  const initialNome = nameParts[0] || ""
  const initialSobrenome = nameParts.slice(1).join(" ") || ""

  const [nome, setNome] = useState(initialNome)
  const [sobrenome, setSobrenome] = useState(initialSobrenome)

  const isValid = nome.trim() !== "" && sobrenome.trim() !== ""
  
  const hasChanges = useMemo(() => {
    return nome.trim() !== initialNome || sobrenome.trim() !== initialSobrenome
  }, [nome, sobrenome, initialNome, initialSobrenome])

  function handleSave() {
    if (isValid && hasChanges && onSave) {
      onSave({ nome: nome.trim(), sobrenome: sobrenome.trim() })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-gamefik">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Editar Aluno</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">
          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-nome" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              id="edit-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João"
              className="h-10 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
            />
          </div>

          {/* Sobrenome */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-sobrenome" className="text-sm font-medium text-foreground">
              Sobrenome
            </label>
            <input
              id="edit-sobrenome"
              type="text"
              value={sobrenome}
              onChange={(e) => setSobrenome(e.target.value)}
              placeholder="Ex: Silva"
              className="h-10 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
            />
          </div>

          {/* Turma (read-only, pre-selected) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Turma
            </label>
            <div className="flex h-10 w-full items-center rounded-xl border border-border bg-secondary/50 px-4 text-sm text-muted-foreground">
              {aluno.turmaNome}
            </div>
            <span className="text-xs text-muted-foreground">
              Para mudar de turma, use a opção "Mover de turma"
            </span>
          </div>
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
            onClick={handleSave}
            disabled={!isValid || !hasChanges}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              isValid && hasChanges
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  )
}
