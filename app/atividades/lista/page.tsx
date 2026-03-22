"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Gamepad2,
  ClipboardList,
  Route,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Plus,
  X,
  Archive,
  Users,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FilterDropdown } from "@/components/filter-dropdown"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Types
type ActivityStatus = "ativa" | "encerrada" | "agendada" | "rascunho"
type ActivityType = "quiz" | "missao" | "trilha"
type Tab = "todos" | "quizzes" | "missoes" | "trilhas"

interface ClassCompletion {
  turma: string
  percent: number
  count: string
}

interface Activity {
  id: string
  title: string
  type: ActivityType
  status: ActivityStatus
  bnccCode: string
  bnccDescription: string
  description: string
  turmas: string[]
  date: string
  pendingCount?: number
  coins: number
  completionPercent: number
  completionCount: string
  isActive: boolean
  classCompletions: ClassCompletion[]
}

// Mock data
const activitiesData: Activity[] = [
  {
    id: "1",
    title: "Quiz: Sistema Solar",
    type: "quiz",
    status: "encerrada",
    bnccCode: "EF06CI05",
    bnccDescription: "Conceber o Sistema Solar como parte da Via Lactea e seu contexto galactico",
    description: "Questoes sobre planetas, satelites naturais, movimentos de rotacao e translacao, e caracteristicas gerais do sistema solar.",
    turmas: ["T10", "T11", "+1"],
    date: "05/03",
    coins: 80,
    completionPercent: 91,
    completionCount: "68/75",
    isActive: false,
    classCompletions: [
      { turma: "T10", percent: 76, count: "19/25" },
      { turma: "T11", percent: 92, count: "23/25" },
      { turma: "T12", percent: 100, count: "26/25" },
    ],
  },
  {
    id: "2",
    title: "Missao: Ler capitulo 3 e enviar foto",
    type: "missao",
    status: "ativa",
    bnccCode: "EF87LP86",
    bnccDescription: "Analisar diferentes formas de composicao de textos",
    description: "Leia o capitulo 3 do livro e envie uma foto da pagina que voce achou mais importante.",
    turmas: ["6A", "6B", "6C", "6D", "7A", "7B", "7C", "7D", "8A", "8B", "8C", "8D", "9A", "9B", "9C", "9D", "1EM", "2EM", "3EM", "Reforco"],
    date: "14/03",
    pendingCount: 5,
    coins: 150,
    completionPercent: 48,
    completionCount: "12/25",
    isActive: true,
    classCompletions: [
      { turma: "6A", percent: 48, count: "12/25" },
      { turma: "6B", percent: 52, count: "13/25" },
      { turma: "6C", percent: 60, count: "15/25" },
    ],
  },
  {
    id: "3",
    title: "Quiz: Fracoes e Numeros Decimais",
    type: "quiz",
    status: "ativa",
    bnccCode: "EF06MA07",
    bnccDescription: "Compreender, comparar e ordenar fracoes e numeros decimais",
    description: "Questoes sobre fracoes equivalentes e operacoes basicas com fracoes e numeros decimais.",
    turmas: ["Turma 10", "Turma 11"],
    date: "15/03",
    coins: 100,
    completionPercent: 76,
    completionCount: "38/50",
    isActive: true,
    classCompletions: [
      { turma: "T10", percent: 72, count: "18/25" },
      { turma: "T11", percent: 80, count: "20/25" },
    ],
  },
  {
    id: "4",
    title: "Missao: Documentario + reflexao",
    type: "missao",
    status: "ativa",
    bnccCode: "EF08AR03",
    bnccDescription: "Pesquisar e analisar diferentes formas de registro e producao artistica",
    description: "Assistir ao documentario indicado e escrever uma reflexao de no minimo 5 linhas sobre o tema abordado.",
    turmas: ["T10", "T11"],
    date: "16/03",
    pendingCount: 3,
    coins: 90,
    completionPercent: 60,
    completionCount: "30/50",
    isActive: true,
    classCompletions: [
      { turma: "T10", percent: 52, count: "13/25" },
      { turma: "T11", percent: 60, count: "15/25" },
    ],
  },
  {
    id: "5",
    title: "Quiz: Revolucao Industrial",
    type: "quiz",
    status: "agendada",
    bnccCode: "EF87H189",
    bnccDescription: "Identificar os principais aspectos da Revolucao Industrial",
    description: "Questoes sobre a Revolucao Industrial e suas consequencias.",
    turmas: ["T11", "T12"],
    date: "20/03",
    coins: 200,
    completionPercent: 0,
    completionCount: "0/50",
    isActive: false,
    classCompletions: [],
  },
  {
    id: "6",
    title: "Desafio em Familia: Receita Matematica",
    type: "missao",
    status: "rascunho",
    bnccCode: "EF05MA18",
    bnccDescription: "Resolver problemas envolvendo medidas de grandezas",
    description: "Preparar uma receita em familia e registrar as medidas utilizadas.",
    turmas: [],
    date: "",
    coins: 120,
    completionPercent: 0,
    completionCount: "",
    isActive: false,
    classCompletions: [],
  },
]

const tabs = [
  { id: "todos" as Tab, label: "Todos", count: 6 },
  { id: "quizzes" as Tab, label: "Quizzes", count: 3 },
  { id: "missoes" as Tab, label: "Missoes", count: 3 },
  { id: "trilhas" as Tab, label: "Trilhas", count: 0, disabled: true },
]

const statusConfig: Record<ActivityStatus, { label: string; className: string }> = {
  ativa: { label: "Ativa", className: "bg-emerald-100 text-emerald-700" },
  encerrada: { label: "Encerrada", className: "bg-muted text-muted-foreground" },
  agendada: { label: "Agendada", className: "bg-amber-100 text-amber-700" },
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
}

const typeIcons: Record<ActivityType, typeof Gamepad2> = {
  quiz: Gamepad2,
  missao: ClipboardList,
  trilha: Route,
}

export default function AtividadesListaPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("todos")
  const [searchQuery, setSearchQuery] = useState("")
  const [activities, setActivities] = useState<Activity[]>(activitiesData)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([])
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null)

  const activityToDelete = deleteActivityId 
    ? activities.find(a => a.id === deleteActivityId) 
    : null

  const handleDeleteActivity = () => {
    if (deleteActivityId) {
      setActivities(prev => prev.filter(a => a.id !== deleteActivityId))
      setDeleteActivityId(null)
    }
  }

  const activeCount = activities.filter((a) => a.status === "ativa").length

  // Get unique turmas from all activities
  const allTurmas = Array.from(
    new Set(activities.flatMap((a) => a.turmas.filter((t) => !t.startsWith("+"))))
  ).sort()

  const filteredActivities = activities.filter((activity) => {
    // Filter by tab
    if (activeTab === "quizzes" && activity.type !== "quiz") return false
    if (activeTab === "missoes" && activity.type !== "missao") return false
    if (activeTab === "trilhas" && activity.type !== "trilha") return false

    // Filter by turmas (multi-select)
    if (selectedTurmas.length > 0) {
      const hasTurma = activity.turmas.some((t) =>
        selectedTurmas.some((selected) => t === selected || t.includes(selected))
      )
      if (!hasTurma) return false
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        activity.title.toLowerCase().includes(query) ||
        activity.bnccCode.toLowerCase().includes(query)
      )
    }

    return true
  })

  const handleToggleActive = (id: string) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, isActive: !a.isActive } : a
      )
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Atividades</h1>
          <p className="text-sm text-muted-foreground">
            {activities.length} atividades · {activeCount} ativas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Manual create button - opens type selection modal */}
          <button
            onClick={() => setShowTypeModal(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Plus className="h-4 w-4" />
            Criar manual
          </button>
          {/* AI create button - shiny gradient, goes directly to creation mode */}
          <Link
            href="/chat?mode=create"
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(to right, #67e8f9, #f0abfc, #fde047)" }}
          >
            <Sparkles className="h-4 w-4" />
            Criar com IA
          </Link>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : tab.disabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
              {tab.disabled && (
                <span className="text-[10px] text-muted-foreground">Em breve</span>
              )}
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por titulo ou BNCC..."
              className="h-9 w-64 rounded-lg border border-border bg-card pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {/* Turma multi-select filter */}
          <FilterDropdown
            label="Todas as turmas"
            options={allTurmas.map((t) => ({ value: t, label: t }))}
            value={selectedTurmas}
            onChange={(v) => setSelectedTurmas(v as string[])}
            multiple
            searchable
            searchPlaceholder="Buscar turma..."
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border">
          {filteredActivities.map((activity) => {
            const TypeIcon = typeIcons[activity.type]
            const statusStyle = statusConfig[activity.status]
            const isExpanded = expandedId === activity.id

            return (
              <div
                key={activity.id}
                className={cn(
                  "transition-colors",
                  isExpanded && "bg-muted/20"
                )}
              >
                {/* Main Row - Clickable */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                  className="group flex cursor-pointer items-center gap-4 px-6 py-3 hover:bg-sidebar-accent/30 transition-colors"
                >
                  {/* Toggle Switch */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(activity.id)
                    }}
                    disabled={activity.status === "rascunho" || activity.status === "encerrada"}
                    className={cn(
                      "flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors",
                      activity.isActive ? "bg-primary" : "bg-border",
                      (activity.status === "rascunho" || activity.status === "encerrada") && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
                      activity.isActive && "translate-x-5"
                    )} />
                  </button>

                  {/* Type Icon */}
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    activity.type === "quiz" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-600"
                  )}>
                    <TypeIcon className="h-5 w-5" />
                  </div>

                  {/* Activity Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {activity.title}
                      </h3>
                      {activity.pendingCount && activity.pendingCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <AlertCircle className="h-3 w-3" />
                          {activity.pendingCount} pend.
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        statusStyle.className
                      )}>
                        {statusStyle.label}
                      </span>
                      {activity.turmas.length > 0 && (() => {
                        const turmas = activity.turmas.filter(t => !t.startsWith("+"))
                        const visibleTurmas = turmas.slice(0, 2)
                        const hiddenTurmas = turmas.slice(2)
                        return (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {visibleTurmas.join(", ")}
                            {hiddenTurmas.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                    +{hiddenTurmas.length}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="top" 
                                  sideOffset={8}
                                  className="border border-border bg-card text-foreground shadow-lg"
                                >
                                  <div className="max-w-[220px] p-1">
                                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                      Todas as turmas ({turmas.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {turmas.map((turma, idx) => (
                                        <span 
                                          key={idx}
                                          className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                                        >
                                          {turma}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        )
                      })()}
                      {activity.date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {activity.date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Coins */}
                  <div className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                    <div className="h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">G</span>
                    </div>
                    {activity.coins}
                  </div>

                  {/* Completion */}
                  <div className="w-20 text-right">
                    {activity.status !== "rascunho" && activity.status !== "agendada" ? (
                      <>
                        <p className={cn(
                          "text-sm font-bold",
                          activity.completionPercent >= 70 ? "text-emerald-600" :
                          activity.completionPercent >= 40 ? "text-amber-600" :
                          "text-muted-foreground"
                        )}>
                          {activity.completionPercent}%
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.completionCount}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-muted-foreground">0%</p>
                        <p className="text-xs text-muted-foreground">0/0</p>
                      </>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteActivityId(activity.id)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Expand Icon */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10 px-6 py-4">
                    {/* Description */}
                    <p className="mb-4 text-sm text-foreground">
                      {activity.description}
                    </p>

                    {/* BNCC Code Details */}
                    <div className="mb-4 rounded-lg border border-border bg-card px-4 py-2">
                      <span className="font-semibold text-primary">{activity.bnccCode}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{activity.bnccDescription}</span>
                    </div>

                    {/* Per-class completion rates */}
                    {activity.classCompletions.length > 0 && (
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        {activity.classCompletions.map((cc) => (
                          <div key={cc.turma} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
                            <span className="text-sm font-medium text-foreground">{cc.turma}</span>
                            <span className={cn(
                              "text-sm font-bold",
                              cc.percent >= 70 ? "text-emerald-600" :
                              cc.percent >= 40 ? "text-amber-600" :
                              "text-muted-foreground"
                            )}>
                              {cc.percent}%
                            </span>
                            <span className="text-xs text-muted-foreground">{cc.count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons - Minimal style */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <Copy className="h-3.5 w-3.5" />
                        Duplicar
                      </button>
                      <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <Archive className="h-3.5 w-3.5" />
                        Arquivar
                      </button>
                      {/* For Quiz: Relatorio is last with subtle purple highlight */}
                      {activity.type === "quiz" && (
                        <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                          <Eye className="h-3.5 w-3.5" />
                          Relatorio
                        </button>
                      )}
                      {/* For Missao: Relatorio normal, then Revisar comprovantes last with subtle purple */}
                      {activity.type === "missao" && (
                        <>
                          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                            <Eye className="h-3.5 w-3.5" />
                            Relatorio
                          </button>
                          {activity.pendingCount && activity.pendingCount > 0 && (
                            <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Revisar {activity.pendingCount} comprovantes
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nenhuma atividade encontrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery ? "Tente buscar por outro termo" : "Crie sua primeira atividade com IA"}
            </p>
            <Link
              href="/chat?mode=create"
              className="mt-4 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(to right, #67e8f9, #f0abfc, #fde047)" }}
            >
              <Sparkles className="h-4 w-4" />
              Criar atividade
            </Link>
          </div>
        )}
      </div>

      {/* Activity Type Selection Modal - Minimalist Design */}
      {showTypeModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowTypeModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Novo tipo de atividade</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Escolha uma opcao abaixo</p>
                </div>
                <button
                  onClick={() => setShowTypeModal(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {/* Quiz option */}
                <button
                  onClick={() => {
                    setShowTypeModal(false)
                    router.push("/atividades/criar-manual?type=quiz")
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-sidebar-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-sidebar-accent-foreground">Quiz</p>
                    <p className="text-xs text-muted-foreground">Perguntas de multipla escolha</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>

                {/* Mission option */}
                <button
                  onClick={() => {
                    setShowTypeModal(false)
                    router.push("/atividades/criar-manual?type=missao")
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-sidebar-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-sidebar-accent-foreground">Missao</p>
                    <p className="text-xs text-muted-foreground">Tarefas com comprovante</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteActivityId} onOpenChange={(open) => !open && setDeleteActivityId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              Excluir atividade
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-foreground">
                {activityToDelete?.title}
              </span>
              ? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 sm:justify-center">
            <AlertDialogCancel className="flex-1 sm:flex-none">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteActivity}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:flex-none"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
