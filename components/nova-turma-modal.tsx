"use client"

import { useState } from "react"
import { X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const segmentos = [
  "Educação Infantil",
  "Ensino Fundamental I",
  "Ensino Fundamental II",
  "Ensino Médio",
  "EJA",
  "Técnico",
  "Superior",
]

interface NovaTurmaModalProps {
  onClose: () => void
  onSave?: (data: { nome: string; segmento: string }) => void
}

export function NovaTurmaModal({ onClose, onSave }: NovaTurmaModalProps) {
  const [nome, setNome] = useState("")
  const [segmento, setSegmento] = useState("")
  const [showSegmentoDropdown, setShowSegmentoDropdown] = useState(false)

  const isValid = nome.trim() !== "" && segmento !== ""

  function handleSave() {
    if (isValid && onSave) {
      onSave({ nome: nome.trim(), segmento })
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
          <h2 className="text-lg font-semibold text-foreground">Nova Turma</h2>
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
          {/* Nome da turma */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Nome da turma
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Turma 3A"
              className="h-10 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
            />
          </div>

          {/* Segmento dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Segmento
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSegmentoDropdown(!showSegmentoDropdown)}
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-xl border bg-card px-4 text-sm transition-colors",
                  segmento
                    ? "text-foreground"
                    : "text-muted-foreground",
                  showSegmentoDropdown
                    ? "border-ring ring-2 ring-ring/30"
                    : "border-border"
                )}
              >
                {segmento || "Selecione o segmento"}
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showSegmentoDropdown && "rotate-180"
                )} />
              </button>

              {showSegmentoDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSegmentoDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-gamefik">
                    {segmentos.map((seg) => (
                      <button
                        key={seg}
                        onClick={() => {
                          setSegmento(seg)
                          setShowSegmentoDropdown(false)
                        }}
                        className={cn(
                          "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                          segmento === seg
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        {seg}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
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
            disabled={!isValid}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              isValid
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Criar turma
          </button>
        </div>
      </div>
    </div>
  )
}
