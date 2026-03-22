"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Sparkles,
  Search,
  Plus,
  Paperclip,
  ListChecks,
  ClipboardList,
  Eye,
  Pencil,
  Play,
  Zap,
  Users,
  ChevronDown,
  Send,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Types
type ActivityType = "quiz" | "missao"
type Message = {
  id: string
  role: "assistant" | "user"
  content: string
  timestamp: Date
}

type RecentActivity = {
  id: string
  title: string
  type: ActivityType
  date: string
  dateLabel: string
}

// Mock data
const recentActivities: RecentActivity[] = [
  { id: "1", title: "Quiz: Fracoes 6 ano", type: "quiz", date: "2024-03-17", dateLabel: "Agora" },
  { id: "2", title: "Missao: Ler capitulo 3", type: "missao", date: "2024-03-17", dateLabel: "Hoje" },
  { id: "3", title: "Quiz: Sistema Solar", type: "quiz", date: "2024-03-16", dateLabel: "Ontem" },
  { id: "4", title: "Desafio em Familia", type: "missao", date: "2024-03-10", dateLabel: "10/03" },
  { id: "5", title: "Quiz: Revolucao Industrial", type: "quiz", date: "2024-03-09", dateLabel: "09/03" },
]

const quickActions = [
  { label: "+ Mais perguntas" },
  { label: "Mais dificil" },
  { label: "Mais facil" },
  { label: "Mudar tema" },
  { label: "Adicionar imagens" },
]

export default function AtividadesPage() {
  const [activityType, setActivityType] = useState<ActivityType>("quiz")
  const [searchQuery, setSearchQuery] = useState("")
  const [inputValue, setInputValue] = useState("")
  const [selectedActivity, setSelectedActivity] = useState<string | null>("1")
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Ola! Descreva a atividade que voce quer criar — pode ser um tema, texto ou ideia. Vou gerar tudo para voce!",
      timestamp: new Date(),
    },
    {
      id: "2",
      role: "user",
      content: "Crie um quiz sobre fracoes para o 6 ano",
      timestamp: new Date(),
    },
    {
      id: "3",
      role: "assistant",
      content: "Pronto! Gerei um quiz com 5 questoes de multipla escolha. Ele ja esta na pre-visualizacao ao lado — confira como o aluno vai ver. Se quiser editar, clique em \"Editar atividade\". Precisa mudar algo?",
      timestamp: new Date(),
    },
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      },
    ])
    setInputValue("")
  }

  const handleQuickAction = (action: string) => {
    setInputValue(action)
  }

  const filteredActivities = recentActivities.filter((activity) =>
    activity.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Nova atividade</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Criacao assistida por IA - editor ao lado
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Activity History */}
        <div className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
          {/* New Activity Button */}
          <div className="p-3">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-sidebar-accent transition-colors">
              <Plus className="h-4 w-4" />
              Nova atividade
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversas..."
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
              />
            </div>
          </div>

          {/* Recent Activities */}
          <div className="flex-1 overflow-auto px-2">
            <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recentes
            </p>
            <div className="space-y-1">
              {filteredActivities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    selectedActivity === activity.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  {activity.type === "quiz" ? (
                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.dateLabel}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Chat Area */}
        <div className="flex flex-1 flex-col">
          {/* Auto-detected Type Badge */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            {activityType === "quiz" ? (
              <span className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700">
                <ClipboardList className="h-3.5 w-3.5" />
                Quiz
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <ListChecks className="h-3.5 w-3.5" />
                Missao
              </span>
            )}
            <span className="text-xs text-muted-foreground">Tipo detectado automaticamente pela IA</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-auto p-4">
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" && "justify-end"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-md rounded-2xl px-4 py-3",
                      message.role === "assistant"
                        ? "bg-card border border-border text-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-border px-4 pt-3">
            <div className="mx-auto max-w-2xl">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.label)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4">
            <div className="mx-auto max-w-2xl">
              {/* Attachment buttons */}
              <div className="mb-2 flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Anexar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                />
                <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                  <FileText className="h-3.5 w-3.5" />
                  Selecionar atividade
                </button>
              </div>

              {/* Text input */}
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Tema, texto ou ideia para o quiz..."
                  className="h-12 w-full rounded-xl border border-border bg-card px-4 pr-12 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className={cn(
                    "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors",
                    inputValue.trim()
                      ? "text-primary hover:bg-sidebar-accent"
                      : "text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Preview Area */}
        <div className="hidden xl:flex w-[400px] flex-col border-l border-border bg-muted/30">
          {/* Preview Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Visualizacao do aluno</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-sidebar-accent transition-colors">
                <Eye className="h-3.5 w-3.5" />
                Pre-visualizar
              </button>
              <button className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-sidebar-accent transition-colors">
                <Pencil className="h-3.5 w-3.5" />
                Editar atividade
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-6">
            <p className="mb-4 text-center text-xs text-muted-foreground">
              Visualizacao no app — como o aluno vera
            </p>

            {/* Phone Mockup */}
            <div className="relative w-[260px]">
              {/* Phone Frame */}
              <div className="overflow-hidden rounded-[2.5rem] border-[8px] border-foreground/90 bg-foreground/90 shadow-2xl">
                {/* Status Bar */}
                <div className="flex items-center justify-between bg-primary px-4 py-2">
                  <span className="text-xs font-medium text-primary-foreground">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="h-2.5 w-6 rounded-full bg-primary-foreground/80" />
                    <div className="h-3 w-3 rounded-full bg-primary-foreground/40" />
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-foreground">
                    <span className="text-[10px] font-bold">AAA</span>
                    <Zap className="h-3 w-3 fill-current" />
                  </div>
                </div>

                {/* App Content */}
                <div className="bg-card">
                  {/* Quiz Image */}
                  <div className="relative h-28 w-full bg-gradient-to-br from-primary/20 to-primary/40">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex -space-x-4">
                        <div className="h-14 w-14 rounded-full bg-amber-400 border-2 border-white" />
                        <div className="h-14 w-14 rounded-full bg-emerald-400 border-2 border-white" />
                        <div className="h-14 w-14 rounded-full bg-rose-400 border-2 border-white" />
                      </div>
                    </div>
                  </div>

                  {/* Quiz Info */}
                  <div className="p-3">
                    <h3 className="mb-2 text-center text-sm font-bold text-primary">
                      Quiz: Fracoes para o 6 Ano
                    </h3>

                    {/* XP and Coins */}
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        50
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                        <Zap className="h-2.5 w-2.5" />
                        100
                      </span>
                    </div>

                    {/* Creator */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/20" />
                      <div>
                        <p className="text-[9px] text-muted-foreground">Criado por</p>
                        <p className="text-[10px] font-semibold text-foreground">Professor Gamefik</p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-2">
                      <p className="mb-0.5 text-[10px] font-semibold text-foreground">Descricao</p>
                      <p className="text-[9px] leading-relaxed text-muted-foreground">
                        Questoes sobre fracoes equivalentes e operacoes basicas com fracoes.
                      </p>
                    </div>

                    {/* Tip */}
                    <div className="mb-3 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2">
                      <div className="h-3 w-3 shrink-0 rounded-full bg-amber-400" />
                      <p className="text-[9px] leading-relaxed text-amber-700">
                        Faca os Quizzes com atencao pois ao final voce ira ganhar moedas proporcional aos acertos!
                      </p>
                    </div>

                    {/* Play Button */}
                    <button className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white">
                      Jogar este Quiz
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Home Indicator */}
              <div className="absolute -bottom-1 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-foreground/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors">
          <FileText className="h-4 w-4" />
          Salvar rascunho
        </button>

        <div className="flex items-center gap-3">
          {/* Class Selector */}
          <div className="relative">
            <button
              onClick={() => setShowClassDropdown(!showClassDropdown)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              Todas as turmas
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showClassDropdown && "rotate-180"
              )} />
            </button>
            {showClassDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowClassDropdown(false)}
                />
                <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-border bg-card p-1 shadow-lg">
                  {["Todas as turmas", "6 Ano A", "6 Ano B", "7 Ano A"].map((turma) => (
                    <button
                      key={turma}
                      onClick={() => setShowClassDropdown(false)}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-sidebar-accent transition-colors"
                    >
                      {turma}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Publish Button */}
          <button
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(to right, #67e8f9, #f0abfc, #fde047)" }}
          >
            <Sparkles className="h-4 w-4" />
            Publicar
          </button>
        </div>
      </div>
    </div>
  )
}
