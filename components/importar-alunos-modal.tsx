"use client"

import { useState, useRef } from "react"
import { X, FileText, FileSpreadsheet, Upload, Download, ChevronLeft, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ImportMode = "word" | "excel"
type Step = "input" | "preview"

interface ParsedAluno {
  id: string
  nome: string
  sobrenome: string
}

interface ImportarAlunosModalProps {
  turmaNome: string
  onClose: () => void
  onImport?: (alunos: { nome: string; sobrenome: string }[]) => void
}

export function ImportarAlunosModal({ turmaNome, onClose, onImport }: ImportarAlunosModalProps) {
  const [mode, setMode] = useState<ImportMode>("word")
  const [step, setStep] = useState<Step>("input")
  const [textContent, setTextContent] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsedAlunos, setParsedAlunos] = useState<ParsedAluno[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = () => {
    const csvContent = "Nome,Sobrenome\nJoão,Silva\nMaria,Santos\nPedro,Oliveira"
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "modelo_importacao_alunos.csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const placeholderText = `Cole os nomes dos alunos aqui. Coloque cada nome em uma nova linha.

Exemplos:

João Silva
Maria Santos
Pedro Oliveira

— ou —

Silva, João
Santos, Maria
Oliveira, Pedro`

  const parseNames = (text: string): ParsedAluno[] => {
    const lines = text.split("\n").filter((line) => line.trim() !== "")
    const alunos: ParsedAluno[] = []
    let idCounter = 0

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("—") || trimmed.toLowerCase().includes("exemplo")) continue

      if (trimmed.includes(",")) {
        // Format: Last name, First name
        const [sobrenome, nome] = trimmed.split(",").map((s) => s.trim())
        if (nome && sobrenome) {
          alunos.push({ id: `aluno-${idCounter++}`, nome, sobrenome })
        }
      } else {
        // Format: First name Last name
        const parts = trimmed.split(" ").filter((p) => p.trim() !== "")
        if (parts.length >= 2) {
          const nome = parts[0]
          const sobrenome = parts.slice(1).join(" ")
          alunos.push({ id: `aluno-${idCounter++}`, nome, sobrenome })
        } else if (parts.length === 1) {
          alunos.push({ id: `aluno-${idCounter++}`, nome: parts[0], sobrenome: "" })
        }
      }
    }

    // Remove duplicates
    const uniqueAlunos = alunos.filter(
      (aluno, index, self) =>
        index === self.findIndex((a) => a.nome === aluno.nome && a.sobrenome === aluno.sobrenome)
    )

    return uniqueAlunos
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    // For demo purposes, we'll read text files
    // In production, you'd use a library like xlsx for Excel files
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setTextContent(content || "")
    }
    reader.readAsText(file)
  }

  const tempParsedAlunos = parseNames(textContent)
  const isValid = step === "input" ? tempParsedAlunos.length > 0 : parsedAlunos.length > 0

  const handleGoToPreview = () => {
    const parsed = parseNames(textContent)
    setParsedAlunos(parsed)
    setStep("preview")
  }

  const handleUpdateAluno = (id: string, field: "nome" | "sobrenome", value: string) => {
    setParsedAlunos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  const handleRemoveAluno = (id: string) => {
    setParsedAlunos((prev) => prev.filter((a) => a.id !== id))
  }

  const handleImport = () => {
    if (parsedAlunos.length > 0 && onImport) {
      onImport(parsedAlunos.map(({ nome, sobrenome }) => ({ nome, sobrenome })))
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-gamefik">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {step === "preview" && (
              <button
                onClick={() => setStep("input")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {step === "input" ? "Importar Lista de Alunos" : "Revisar Alunos"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6 max-h-[60vh] overflow-y-auto">
          {step === "input" ? (
            <>
              {/* Mode Toggle */}
              <div className="flex justify-center">
                <div className="inline-flex rounded-full border border-border overflow-hidden">
                  <button
                    onClick={() => setMode("word")}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors",
                      mode === "word"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    Copiar/Colar
                  </button>
                  <button
                    onClick={() => setMode("excel")}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors",
                      mode === "excel"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar Excel
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">
                  {mode === "word" ? "Cole sua lista de alunos" : "Importe do Excel"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "word"
                    ? "Importaremos automaticamente sua lista e removeremos duplicados."
                    : "Selecione um arquivo Excel (.xlsx, .xls) com a lista de alunos."}
                </p>
              </div>

              {/* Turma info */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">Turma de destino:</span>
                <span className="font-medium text-foreground">{turmaNome}</span>
              </div>

              {mode === "word" ? (
                /* Text Area */
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={placeholderText}
                  className="h-56 w-full resize-y rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                />
              ) : (
                /* File Upload */
                <div className="flex flex-col gap-3">
                  {/* Download template */}
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    Baixar modelo de planilha
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-sidebar-accent"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Clique para selecionar um arquivo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      .xlsx, .xls ou .csv
                    </span>
                  </button>
                  {fileName && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-foreground">{fileName}</span>
                    </div>
                  )}
                  {textContent && (
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Conteudo do arquivo..."
                      className="h-32 w-full resize-y rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                    />
                  )}
                </div>
              )}

              {/* Preview count */}
              {tempParsedAlunos.length > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm">
                  <span className="font-medium text-emerald-700">
                    {tempParsedAlunos.length} aluno{tempParsedAlunos.length !== 1 ? "s" : ""} encontrado{tempParsedAlunos.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </>
          ) : (
            /* Preview Step */
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">
                  Revise os alunos antes de importar
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Voce pode editar ou remover alunos da lista antes de confirmar.
                </p>
              </div>

              {/* Turma info */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">Turma de destino:</span>
                <span className="font-medium text-foreground">{turmaNome}</span>
              </div>

              {/* Alunos list */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  <span>Nome</span>
                  <span>Sobrenome</span>
                  <span className="w-16"></span>
                </div>
                {parsedAlunos.map((aluno) => (
                  <div
                    key={aluno.id}
                    className="group grid grid-cols-[1fr_1fr_auto] gap-2 items-center rounded-lg border border-border bg-card px-3 py-2"
                  >
                    {editingId === aluno.id ? (
                      <>
                        <input
                          type="text"
                          value={aluno.nome}
                          onChange={(e) => handleUpdateAluno(aluno.id, "nome", e.target.value)}
                          className="h-8 rounded-md border border-border bg-muted px-2 text-sm outline-none focus:border-ring"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={aluno.sobrenome}
                          onChange={(e) => handleUpdateAluno(aluno.id, "sobrenome", e.target.value)}
                          className="h-8 rounded-md border border-border bg-muted px-2 text-sm outline-none focus:border-ring"
                        />
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex h-8 w-16 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground"
                        >
                          OK
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-foreground truncate">{aluno.nome}</span>
                        <span className="text-sm text-foreground truncate">{aluno.sobrenome || "-"}</span>
                        <div className="flex items-center gap-1 w-16 justify-end">
                          <button
                            onClick={() => setEditingId(aluno.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
                            aria-label="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveAluno(aluno.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Count */}
              <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm">
                <span className="font-medium text-emerald-700">
                  {parsedAlunos.length} aluno{parsedAlunos.length !== 1 ? "s" : ""} para importar
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={step === "preview" ? () => setStep("input") : onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors"
          >
            {step === "preview" ? "Voltar" : "Cancelar"}
          </button>
          {step === "input" ? (
            <button
              onClick={handleGoToPreview}
              disabled={!isValid}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
                isValid
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Revisar lista
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={parsedAlunos.length === 0}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
                parsedAlunos.length > 0
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Importar {parsedAlunos.length} aluno{parsedAlunos.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
