"use client"

import { useState } from "react"
import Image from "next/image"
import { X, QrCode, Copy, Pencil, Check, Undo2, Heart, Target, HelpCircle, ThumbsDown, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Aluno } from "@/lib/data"

const AVATAR_MENINO = "/images/avatar-menino.jpeg"
const AVATAR_MENINA = "/images/avatar-menina.jpeg"

interface HistoricoItem {
  id: string
  tipo: "atitude_positiva" | "atitude_negativa" | "missao" | "quiz"
  titulo: string
  pontos: number
  data: string
  hora: string
}

// Mock history data
const mockHistorico: HistoricoItem[] = [
  { id: "1", tipo: "atitude_positiva", titulo: "Ajudar o próximo", pontos: 10, data: "12/03/2026", hora: "14:30" },
  { id: "2", tipo: "missao", titulo: "Completar lição de casa", pontos: 25, data: "12/03/2026", hora: "10:15" },
  { id: "3", tipo: "quiz", titulo: "Quiz de Matemática", pontos: 15, data: "11/03/2026", hora: "16:45" },
  { id: "4", tipo: "atitude_negativa", titulo: "Conversa excessiva", pontos: -5, data: "11/03/2026", hora: "09:20" },
  { id: "5", tipo: "atitude_positiva", titulo: "Participação", pontos: 10, data: "10/03/2026", hora: "11:00" },
  { id: "6", tipo: "missao", titulo: "Projeto de Ciências", pontos: 50, data: "09/03/2026", hora: "15:30" },
  { id: "7", tipo: "atitude_negativa", titulo: "Atraso", pontos: -3, data: "08/03/2026", hora: "08:05" },
]

interface VerAlunoModalProps {
  aluno: Aluno
  segmento?: string
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
}

type Tab = "perfil" | "historico"

export function VerAlunoModal({
  aluno,
  segmento = "Rosa Mística",
  onClose,
  onEdit,
  onDelete,
}: VerAlunoModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("perfil")
  const [copied, setCopied] = useState(false)
  const [historico, setHistorico] = useState<HistoricoItem[]>(mockHistorico)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://gamefik.app/aluno/${aluno.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUndo = (itemId: string) => {
    setHistorico((prev) => prev.filter((item) => item.id !== itemId))
  }

  const formatFullName = (shortName: string): string => {
    return shortName.replace(/\s([A-Z])\.\s/, (_, l) => ` ${l}. `)
  }

  const getHistoricoIcon = (tipo: HistoricoItem["tipo"]) => {
    switch (tipo) {
      case "atitude_positiva":
        return <Heart className="h-4 w-4 text-emerald-500" />
      case "atitude_negativa":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "missao":
        return <Target className="h-4 w-4 text-blue-500" />
      case "quiz":
        return <HelpCircle className="h-4 w-4 text-violet-500" />
    }
  }

  const getHistoricoBadgeStyle = (tipo: HistoricoItem["tipo"]) => {
    switch (tipo) {
      case "atitude_positiva":
        return "bg-emerald-100 text-emerald-700"
      case "atitude_negativa":
        return "bg-red-100 text-red-700"
      case "missao":
        return "bg-blue-100 text-blue-700"
      case "quiz":
        return "bg-violet-100 text-violet-700"
    }
  }

  const getHistoricoLabel = (tipo: HistoricoItem["tipo"]) => {
    switch (tipo) {
      case "atitude_positiva":
        return "Atitude"
      case "atitude_negativa":
        return "Atitude"
      case "missao":
        return "Missão"
      case "quiz":
        return "Quiz"
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Aluno(a)</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs - Using same pattern as turmas/alunos pages */}
        <div className="flex gap-0 border-b border-border px-6">
          {([
            { key: "perfil", label: "Perfil" },
            { key: "historico", label: "Histórico" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "perfil" ? (
            <div className="flex flex-col gap-6">
              {/* Avatar */}
              <div className="flex justify-start">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-muted">
                  <Image
                    src={aluno.genero === "F" ? AVATAR_MENINA : AVATAR_MENINO}
                    alt={aluno.nome}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Name & Join Date */}
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {formatFullName(aluno.nome).replace(/\s([A-Z])\.\s/, " $1. ").split(" ").map((part, i) => 
                    i === 0 || part.length > 2 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
                  ).join(" ")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entrou em {aluno.entradaEm}
                </p>
              </div>

              {/* Info Rows */}
              <div className="flex flex-col divide-y divide-border">
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-foreground">Segmento</span>
                  <span className="text-sm text-muted-foreground">{segmento}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-foreground">Turma</span>
                  <span className="text-sm text-muted-foreground">{aluno.turmaNome}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-foreground">Moedas</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="text-amber-500">🪙</span>
                    {aluno.moedas.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <QrCode className="h-4 w-4" />
                  Vincular QR Code
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar link de acesso
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum registro no histórico.
                </p>
              ) : (
                historico.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-all hover:shadow-md"
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      {getHistoricoIcon(item.tipo)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          getHistoricoBadgeStyle(item.tipo)
                        )}>
                          {getHistoricoLabel(item.tipo)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.data} às {item.hora}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-foreground truncate">
                        {item.titulo}
                      </p>
                    </div>

                    {/* Points */}
                    <div className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                      item.pontos >= 0 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-red-100 text-red-700"
                    )}>
                      {item.pontos >= 0 ? "+" : ""}{item.pontos} pts
                    </div>

                    {/* Undo Button */}
                    <button
                      onClick={() => handleUndo(item.id)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-sidebar-accent hover:text-destructive group-hover:opacity-100"
                      aria-label="Desfazer lançamento"
                      title="Desfazer"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 border-t border-border px-6 py-4 bg-muted/30">
          <button
            onClick={onDelete}
            className="rounded-full bg-red-100 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-200"
          >
            Excluir aluno
          </button>
          <button
            onClick={() => {
              onClose()
              onEdit?.()
            }}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Pencil className="h-4 w-4" />
            Editar aluno
          </button>
        </div>
      </div>
    </div>
  )
}
