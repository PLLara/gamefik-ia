"use client"

import { useState } from "react"
import Image from "next/image"
import {
  X,
  Heart,
  ThumbsUp,
  Lightbulb,
  Flag,
  Users,
  Trophy,
  Handshake,
  BookOpen,
  Star,
  Sparkles,
  Plus,
  Coins,
  ThumbsDown,
  AlertTriangle,
  Volume2,
  Clock,
  Ban,
  Frown,
  MessageCircleOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Aluno } from "@/lib/data"
import { NovaAtitudeModal } from "./nova-atitude-modal"

const AVATAR_MENINO = "/images/avatar-menino.jpeg"
const AVATAR_MENINA = "/images/avatar-menina.jpeg"

interface Atitude {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  tipo: "positiva" | "negativa"
}

const atitudes: Atitude[] = [
  // Positivas
  { id: "ajudar", label: "Ajudar o proximo", icon: <Heart className="h-6 w-6" />, color: "text-rose-500", tipo: "positiva" },
  { id: "participacao", label: "Participação", icon: <ThumbsUp className="h-6 w-6" />, color: "text-emerald-500", tipo: "positiva" },
  { id: "criatividade", label: "Criatividade", icon: <Lightbulb className="h-6 w-6" />, color: "text-amber-500", tipo: "positiva" },
  { id: "persistencia", label: "Persistência", icon: <Flag className="h-6 w-6" />, color: "text-blue-500", tipo: "positiva" },
  { id: "trabalho-equipe", label: "Trabalho em equipe", icon: <Users className="h-6 w-6" />, color: "text-violet-500", tipo: "positiva" },
  { id: "esforco", label: "Esforço", icon: <Trophy className="h-6 w-6" />, color: "text-orange-500", tipo: "positiva" },
  { id: "respeito", label: "Respeito", icon: <Handshake className="h-6 w-6" />, color: "text-teal-500", tipo: "positiva" },
  { id: "dedicacao", label: "Dedicação aos estudos", icon: <BookOpen className="h-6 w-6" />, color: "text-indigo-500", tipo: "positiva" },
  { id: "lideranca", label: "Liderança", icon: <Star className="h-6 w-6" />, color: "text-yellow-500", tipo: "positiva" },
  { id: "superacao", label: "Superação", icon: <Sparkles className="h-6 w-6" />, color: "text-pink-500", tipo: "positiva" },
  // Negativas
  { id: "indisciplina", label: "Indisciplina", icon: <AlertTriangle className="h-6 w-6" />, color: "text-red-500", tipo: "negativa" },
  { id: "conversa", label: "Conversa excessiva", icon: <Volume2 className="h-6 w-6" />, color: "text-red-400", tipo: "negativa" },
  { id: "atraso", label: "Atraso", icon: <Clock className="h-6 w-6" />, color: "text-orange-600", tipo: "negativa" },
  { id: "desrespeito", label: "Desrespeito", icon: <Ban className="h-6 w-6" />, color: "text-red-600", tipo: "negativa" },
  { id: "desatencao", label: "Desatenção", icon: <Frown className="h-6 w-6" />, color: "text-amber-600", tipo: "negativa" },
  { id: "nao-participacao", label: "Não participação", icon: <MessageCircleOff className="h-6 w-6" />, color: "text-slate-500", tipo: "negativa" },
]

type AtitudeTipo = "positiva" | "negativa"

type SidebarTab = "atitudes" | "moedas"

interface LancarModalProps {
  alunos: Aluno[]
  onClose: () => void
}

export function LancarModal({ alunos, onClose }: LancarModalProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("atitudes")
  const [atitudeTipo, setAtitudeTipo] = useState<AtitudeTipo>("positiva")
  const [lancados, setLancados] = useState<Record<string, number>>({})
  const [moedasMotivo, setMoedasMotivo] = useState("")
  const [moedasOperacao, setMoedasOperacao] = useState<"adicionar" | "remover">("adicionar")
  const [moedasQuantidade, setMoedasQuantidade] = useState(0)
  const [showNovaAtitudeModal, setShowNovaAtitudeModal] = useState(false)

  const atitudesFiltradas = atitudes.filter((a) => a.tipo === atitudeTipo)

  function handleLancarAtitude(atitudeId: string) {
    setLancados((prev) => ({
      ...prev,
      [atitudeId]: (prev[atitudeId] || 0) + 1,
    }))
  }

  const totalLancamentos = Object.values(lancados).reduce((s, v) => s + v, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-gamefik">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border px-6 py-4">
          {/* Avatars stack */}
          <div className="flex -space-x-2">
            {alunos.slice(0, 5).map((aluno, i) => (
              <div
                key={aluno.id}
                className="h-10 w-10 overflow-hidden rounded-full border-2 border-card"
                style={{ zIndex: 5 - i }}
              >
                <Image
                  src={aluno.genero === "F" ? AVATAR_MENINA : AVATAR_MENINO}
                  alt={aluno.nome}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
            {alunos.length > 5 && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold text-muted-foreground">
                +{alunos.length - 5}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              {alunos.length === 1
                ? alunos[0].nome
                : `${alunos.length} alunos selecionados`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {alunos[0]?.turmaNome}
            </p>
          </div>

          {totalLancamentos > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5">
              <span className="text-xs font-semibold text-accent-foreground">
                {totalLancamentos} lançamento{totalLancamentos !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="flex w-56 shrink-0 flex-col border-r border-border bg-secondary/30 p-4">
            <span className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Lançar
            </span>

            <button
              onClick={() => setActiveTab("atitudes")}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === "atitudes"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-sidebar-accent"
              )}
            >
              <Heart className="h-4 w-4" />
              Atitudes
            </button>

            <button
              onClick={() => setActiveTab("moedas")}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === "moedas"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-sidebar-accent"
              )}
            >
              <Coins className="h-4 w-4" />
              Ajustar moedas
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === "atitudes" ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Atitudes</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Selecione as atitudes para lançar aos alunos selecionados.
                    </p>
                  </div>

                  {/* Toggle Positiva/Negativa */}
                  <div className="flex rounded-full border border-border overflow-hidden">
                    <button
                      onClick={() => setAtitudeTipo("positiva")}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors",
                        atitudeTipo === "positiva"
                          ? "bg-emerald-500 text-white"
                          : "bg-card text-muted-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Positiva
                    </button>
                    <button
                      onClick={() => setAtitudeTipo("negativa")}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors",
                        atitudeTipo === "negativa"
                          ? "bg-red-500 text-white"
                          : "bg-card text-muted-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      Negativa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {atitudesFiltradas.map((atitude) => {
                    const count = lancados[atitude.id] || 0
                    return (
                      <button
                        key={atitude.id}
                        onClick={() => handleLancarAtitude(atitude.id)}
                        className={cn(
                          "group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-md",
                          count > 0 && atitude.tipo === "positiva" && "border-emerald-400/60 bg-emerald-50",
                          count > 0 && atitude.tipo === "negativa" && "border-red-400/60 bg-red-50",
                          count === 0 && "border-border"
                        )}
                      >
                        {count > 0 && (
                          <span className={cn(
                            "absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white",
                            atitude.tipo === "positiva" ? "bg-emerald-500" : "bg-red-500"
                          )}>
                            {atitude.tipo === "positiva" ? "+" : "-"}{count}
                          </span>
                        )}
                        <span className={atitude.color}>{atitude.icon}</span>
                        <span className="text-xs font-medium text-foreground text-center leading-tight">
                          {atitude.label}
                        </span>
                      </button>
                    )
                  })}

                  {/* Add custom */}
                  <button
                    onClick={() => setShowNovaAtitudeModal(true)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors",
                      atitudeTipo === "positiva"
                        ? "border-emerald-400 hover:bg-emerald-50"
                        : "border-red-400 hover:bg-red-50"
                    )}
                  >
                    <div className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2",
                      atitudeTipo === "positiva"
                        ? "border-emerald-500 text-emerald-500"
                        : "border-red-500 text-red-500"
                    )}>
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                    <span className={cn(
                      "text-xs font-medium text-center",
                      atitudeTipo === "positiva" ? "text-emerald-600" : "text-red-600"
                    )}>
                      Adicionar {atitudeTipo === "positiva" ? "positiva" : "negativa"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Ajustar moedas</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Adicione ou remova moedas dos alunos selecionados.
                  </p>
                </div>

                {/* Motivo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Motivo</label>
                  <textarea
                    value={moedasMotivo}
                    onChange={(e) => setMoedasMotivo(e.target.value)}
                    placeholder="Insira o motivo do saldo ser modificado..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                  />
                </div>

                {/* Adicionar / Remover toggle */}
                <div className="flex rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setMoedasOperacao("adicionar")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
                      moedasOperacao === "adicionar"
                        ? "bg-accent text-accent-foreground"
                        : "bg-card text-muted-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Adicionar
                  </button>
                  <button
                    onClick={() => setMoedasOperacao("remover")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
                      moedasOperacao === "remover"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-card text-muted-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Remover
                  </button>
                </div>

                {/* Moedas input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Moedas</label>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <Coins className="h-5 w-5 text-amber-500" />
                    <input
                      type="number"
                      min={0}
                      value={moedasQuantidade}
                      onChange={(e) => setMoedasQuantidade(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 border-0 bg-transparent text-lg font-semibold text-foreground outline-none"
                    />
                  </div>
                </div>

                {/* Lista de alunos */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Alunos ({alunos.length})
                  </span>
                  <div className="flex flex-col gap-1 max-h-32 overflow-auto rounded-xl border border-border bg-secondary/30 p-2">
                    {alunos.map((aluno) => (
                      <div key={aluno.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground">
                        <div className="h-6 w-6 overflow-hidden rounded-full">
                          <Image
                            src={aluno.genero === "F" ? AVATAR_MENINA : AVATAR_MENINO}
                            alt={aluno.nome}
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        {aluno.nome}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
            onClick={onClose}
            disabled={totalLancamentos === 0 && moedasQuantidade === 0}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              totalLancamentos > 0 || moedasQuantidade > 0
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Confirmar
          </button>
        </div>
      </div>

      {/* Nova Atitude Modal */}
      {showNovaAtitudeModal && (
        <NovaAtitudeModal
          defaultTipo={atitudeTipo}
          onClose={() => setShowNovaAtitudeModal(false)}
        />
      )}
    </div>
  )
}
