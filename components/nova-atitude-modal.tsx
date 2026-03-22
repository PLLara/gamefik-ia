"use client"

import { useState } from "react"
import {
  X,
  ChevronDown,
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
  Target,
  Zap,
  Award,
  Smile,
  Frown,
  AlertTriangle,
  Clock,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const iconsPositivos = [
  { id: "heart", icon: Heart, label: "Coracao", color: "text-rose-500 bg-rose-100" },
  { id: "thumbsup", icon: ThumbsUp, label: "Joinha", color: "text-emerald-500 bg-emerald-100" },
  { id: "lightbulb", icon: Lightbulb, label: "Lampada", color: "text-amber-500 bg-amber-100" },
  { id: "flag", icon: Flag, label: "Bandeira", color: "text-blue-500 bg-blue-100" },
  { id: "users", icon: Users, label: "Equipe", color: "text-violet-500 bg-violet-100" },
  { id: "trophy", icon: Trophy, label: "Trofeu", color: "text-orange-500 bg-orange-100" },
  { id: "handshake", icon: Handshake, label: "Aperto de mao", color: "text-teal-500 bg-teal-100" },
  { id: "bookopen", icon: BookOpen, label: "Livro", color: "text-indigo-500 bg-indigo-100" },
  { id: "star", icon: Star, label: "Estrela", color: "text-yellow-500 bg-yellow-100" },
  { id: "sparkles", icon: Sparkles, label: "Brilho", color: "text-pink-500 bg-pink-100" },
  { id: "target", icon: Target, label: "Alvo", color: "text-cyan-500 bg-cyan-100" },
  { id: "zap", icon: Zap, label: "Raio", color: "text-purple-500 bg-purple-100" },
  { id: "award", icon: Award, label: "Premio", color: "text-lime-600 bg-lime-100" },
  { id: "smile", icon: Smile, label: "Sorriso", color: "text-green-500 bg-green-100" },
]

const iconsNegativos = [
  { id: "frown", icon: Frown, label: "Triste", color: "text-red-500 bg-red-100" },
  { id: "alert", icon: AlertTriangle, label: "Alerta", color: "text-orange-500 bg-orange-100" },
  { id: "clock", icon: Clock, label: "Atraso", color: "text-slate-500 bg-slate-100" },
  { id: "message", icon: MessageCircle, label: "Conversa", color: "text-gray-500 bg-gray-100" },
]

const pontosOpcoes = [1, 2, 3, 4, 5]

interface NovaAtitudeModalProps {
  onClose: () => void
  defaultTipo?: "positiva" | "negativa"
  onSave?: (atitude: {
    nome: string
    tipo: "positiva" | "negativa"
    iconeId: string
    pontos: number
  }) => void
}

export function NovaAtitudeModal({ onClose, onSave, defaultTipo = "positiva" }: NovaAtitudeModalProps) {
  const [tipo, setTipo] = useState<"positiva" | "negativa">(defaultTipo)
  const [nome, setNome] = useState("")
  const [iconeId, setIconeId] = useState("thumbsup")
  const [pontos, setPontos] = useState(1)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showPontosPicker, setShowPontosPicker] = useState(false)
  const [touched, setTouched] = useState(false)

  const icons = tipo === "positiva" ? iconsPositivos : iconsNegativos
  const selectedIcon = icons.find((i) => i.id === iconeId) || icons[0]
  const IconComponent = selectedIcon.icon

  const isValid = nome.trim().length > 0
  const showError = touched && !isValid

  function handleSave() {
    if (!isValid) {
      setTouched(true)
      return
    }
    onSave?.({ nome, tipo, iconeId, pontos })
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
          <h2 className="text-lg font-semibold text-foreground">Nova atitude</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 p-6">
          {/* Tipo toggle: Positiva / Negativa */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => {
                  setTipo("positiva")
                  setIconeId("thumbsup")
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors",
                  tipo === "positiva"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-sidebar-accent"
                )}
              >
                Positiva
              </button>
              <button
                onClick={() => {
                  setTipo("negativa")
                  setIconeId("frown")
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors",
                  tipo === "negativa"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-card text-muted-foreground hover:bg-sidebar-accent"
                )}
              >
                Precisa melhorar
              </button>
            </div>
          </div>

          {/* Icon Picker */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-border transition-colors hover:bg-sidebar-accent",
                  selectedIcon.color.split(" ")[1]
                )}
              >
                <IconComponent className={cn("h-10 w-10", selectedIcon.color.split(" ")[0])} />
              </button>
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-sidebar-accent"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {/* Icon dropdown */}
              {showIconPicker && (
                <div className="absolute top-full left-1/2 z-20 mt-2 -translate-x-1/2 w-64 rounded-xl border border-border bg-card p-3 shadow-gamefik">
                  <div className="grid grid-cols-5 gap-2">
                    {icons.map((icon) => {
                      const Icon = icon.icon
                      return (
                        <button
                          key={icon.id}
                          onClick={() => {
                            setIconeId(icon.id)
                            setShowIconPicker(false)
                          }}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                            iconeId === icon.id
                              ? "ring-2 ring-ring ring-offset-2"
                              : "hover:bg-sidebar-accent",
                            icon.color.split(" ")[1]
                          )}
                        >
                          <Icon className={cn("h-5 w-5", icon.color.split(" ")[0])} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder='Ex: "Participacao"'
              className={cn(
                "w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors",
                showError
                  ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                  : "border-border focus:border-ring focus:ring-2 focus:ring-ring/30"
              )}
            />
            {showError && (
              <span className="text-xs text-destructive">Por favor, insira um nome para a atitude.</span>
            )}
          </div>

          {/* Peso em pontos */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Peso em pontos</label>
            <div className="relative">
              <button
                onClick={() => setShowPontosPicker(!showPontosPicker)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground hover:bg-sidebar-accent transition-colors"
              >
                <span>{pontos}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showPontosPicker && (
                <div className="absolute top-full left-0 z-20 mt-1 w-full rounded-xl border border-border bg-card p-2 shadow-gamefik">
                  {pontosOpcoes.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPontos(p)
                        setShowPontosPicker(false)
                      }}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                        pontos === p
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-secondary/30 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-all",
              isValid
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
