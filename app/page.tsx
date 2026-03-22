"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import {
  Sparkles,
  Gamepad2,
  ClipboardList,
  Paperclip,
  X,
  FileText,
  ImageIcon,
  ArrowLeft,
  Search,
  Plus,
  Send,
  Eye,
  Pencil,
  Users,
  ChevronDown,
  Save,
  Zap,
  Play,
  Trash2,
  ArrowRight,
  Camera,
  Video,
  Bold,
  Italic,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FilterDropdown } from "@/components/filter-dropdown"

type ActivityType = "quiz" | "missao"
type ViewMode = "initial" | "creating"
type RightPanelView = "preview" | "editor"

type Message = {
  id: string
  role: "ai" | "user"
  content: string
  timestamp: Date
}

type RecentActivity = {
  id: string
  title: string
  type: ActivityType
  date: string
}

type Attachment = {
  id: string
  name: string
  type: "pdf" | "image"
  size: string
}

type QuizQuestion = {
  id: string
  enunciado: string
  alternatives: { label: string; text: string; correct: boolean }[]
  points: number
}

const quickChips = [
  "+ Mais perguntas",
  "Mais dificil",
  "Mais facil",
  "Mudar tema",
  "Adicionar imagens",
]

const recentActivities: RecentActivity[] = [
  { id: "1", title: "Quiz: Fracoes 6o ano", type: "quiz", date: "Agora" },
  { id: "2", title: "Missao: Ler capitulo 3", type: "missao", date: "Hoje" },
  { id: "3", title: "Quiz: Sistema Solar", type: "quiz", date: "Ontem" },
  { id: "4", title: "Desafio em Familia", type: "missao", date: "10/03" },
  { id: "5", title: "Quiz: Revolucao Industrial", type: "quiz", date: "09/03" },
]

const defaultQuizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    enunciado: "Qual e a fracao equivalente a 1/2?",
    alternatives: [
      { label: "A", text: "2/6", correct: false },
      { label: "B", text: "3/6", correct: true },
      { label: "C", text: "1/3", correct: false },
      { label: "D", text: "2/4", correct: false },
    ],
    points: 10,
  },
  {
    id: "q2",
    enunciado: "Quanto e 1/2 + 1/4?",
    alternatives: [
      { label: "A", text: "2/6", correct: false },
      { label: "B", text: "3/4", correct: true },
      { label: "C", text: "1/2", correct: false },
      { label: "D", text: "2/4", correct: false },
    ],
    points: 10,
  },
  {
    id: "q3",
    enunciado: "Qual fracao e maior: 2/3 ou 3/5?",
    alternatives: [
      { label: "A", text: "2/3", correct: true },
      { label: "B", text: "3/5", correct: false },
      { label: "C", text: "Sao iguais", correct: false },
      { label: "D", text: "Nenhuma", correct: false },
    ],
    points: 10,
  },
  {
    id: "q4",
    enunciado: "Simplifique a fracao 4/8.",
    alternatives: [
      { label: "A", text: "1/4", correct: false },
      { label: "B", text: "2/4", correct: false },
      { label: "C", text: "1/2", correct: true },
      { label: "D", text: "2/8", correct: false },
    ],
    points: 10,
  },
  {
    id: "q5",
    enunciado: "Quanto e 3/4 - 1/4?",
    alternatives: [
      { label: "A", text: "2/4", correct: true },
      { label: "B", text: "1/4", correct: false },
      { label: "C", text: "3/4", correct: false },
      { label: "D", text: "1/2", correct: false },
    ],
    points: 10,
  },
]

function ChatContent() {
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>(
    searchParams.get("mode") === "create" ? "creating" : "initial"
  )
  const [activityType, setActivityType] = useState<ActivityType>("quiz")
  const [rightPanel, setRightPanel] = useState<RightPanelView>("editor")
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Ola! Descreva a atividade que voce quer criar — pode ser um tema, texto ou ideia. Vou gerar tudo para voce!",
      timestamp: new Date(),
    },
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Quiz editor state
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(defaultQuizQuestions)

  // Quiz editor tabs
  const [quizTab, setQuizTab] = useState<"informacoes" | "questoes">("questoes")

  // Mission editor state
  const [missionTitle, setMissionTitle] = useState("Missao: Leitura e Reflexao")
  const [missionDesc, setMissionDesc] = useState("Os alunos devem ler o capitulo 3 do livro e refletir sobre o conteudo.")
  const [missionProofType, setMissionProofType] = useState("foto")
  const [missionValidation, setMissionValidation] = useState("ia")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() && attachments.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `Pronto! Gerei um ${activityType === "quiz" ? "quiz com 5 questoes de multipla escolha" : "missao com tarefa e validacao"}. Clique em "Editar atividade" para personalizar ou "Pre-visualizar" para ver como o aluno vai ver. Precisa mudar algo?`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setViewMode("creating")
    }, 500)

    setMessage("")
    setAttachments([])
  }



  const handleQuickChip = (chip: string) => {
    setMessage(chip)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newAttachments: Attachment[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isPdf = file.type === "application/pdf"
      const isImage = file.type.startsWith("image/")

      if (isPdf || isImage) {
        newAttachments.push({
          id: `${Date.now()}-${i}`,
          name: file.name,
          type: isPdf ? "pdf" : "image",
          size: formatFileSize(file.size),
        })
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleBack = () => {
    setViewMode("initial")
    setMessages([
      {
        id: "1",
        role: "ai",
        content: "Ola! Descreva a atividade que voce quer criar — pode ser um tema, texto ou ideia. Vou gerar tudo para voce!",
        timestamp: new Date(),
      },
    ])
  }

  const toggleCorrectAnswer = (qIndex: number, altIndex: number) => {
    setQuizQuestions((prev) => {
      const updated = [...prev]
      updated[qIndex] = {
        ...updated[qIndex],
        alternatives: updated[qIndex].alternatives.map((alt, i) => ({
          ...alt,
          correct: i === altIndex,
        })),
      }
      return updated
    })
  }

  const updateAlternativeText = (qIndex: number, altIndex: number, text: string) => {
    setQuizQuestions((prev) => {
      const updated = [...prev]
      updated[qIndex] = {
        ...updated[qIndex],
        alternatives: updated[qIndex].alternatives.map((alt, i) =>
          i === altIndex ? { ...alt, text } : alt
        ),
      }
      return updated
    })
  }

  const updateEnunciado = (qIndex: number, text: string) => {
    setQuizQuestions((prev) => {
      const updated = [...prev]
      updated[qIndex] = { ...updated[qIndex], enunciado: text }
      return updated
    })
  }

  const updatePoints = (qIndex: number, points: number) => {
    setQuizQuestions(prev => {
      const copy = [...prev]
      copy[qIndex] = { ...copy[qIndex], points }
      return copy
    })
  }

  const addQuestion = () => {
    const newIndex = quizQuestions.length
    const newQuestion: QuizQuestion = {
      id: `q${newIndex + 1}`,
      enunciado: "",
      alternatives: [
        { label: "A", text: "", correct: true },
        { label: "B", text: "", correct: false },
        { label: "C", text: "", correct: false },
        { label: "D", text: "", correct: false },
      ],
      points: 10,
    }
    setQuizQuestions(prev => [...prev, newQuestion])
    setCurrentQuestion(newIndex)
  }

  const addAlternative = (qIndex: number) => {
    setQuizQuestions(prev => {
      const copy = [...prev]
      const q = copy[qIndex]
      const nextLabel = String.fromCharCode(65 + q.alternatives.length)
      if (q.alternatives.length >= 6) return prev
      copy[qIndex] = {
        ...q,
        alternatives: [...q.alternatives, { label: nextLabel, text: "", correct: false }],
      }
      return copy
    })
  }

  const removeAlternative = (qIndex: number, altIndex: number) => {
    setQuizQuestions(prev => {
      const copy = [...prev]
      const q = copy[qIndex]
      if (q.alternatives.length <= 2) return prev
      const newAlts = q.alternatives.filter((_, i) => i !== altIndex).map((alt, i) => ({
        ...alt,
        label: String.fromCharCode(65 + i),
      }))
      copy[qIndex] = { ...q, alternatives: newAlts }
      return copy
    })
  }

  const canSubmit = message.trim() || attachments.length > 0

  // Initial Chat View
  if (viewMode === "initial") {
    return (
      <div className="relative flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
        {/* Fantasy background + brand atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/images/chat-background.jpg"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/45 to-background/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/92 via-transparent to-background/55" />
          <div className="absolute inset-0 bg-radial-[at_50%_40%] from-transparent via-background/25 to-background/75" />
          {/* Soft brand glows (purple + mint) */}
          <div className="absolute -left-24 top-[12%] h-[22rem] w-[22rem] rounded-full bg-primary/25 blur-[100px]" />
          <div className="absolute -right-20 bottom-[18%] h-[20rem] w-[20rem] rounded-full bg-primary/20 blur-[90px]" />
          <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-[48%] rounded-full bg-[oklch(0.88_0.12_165_/_0.12)] blur-[110px]" />
          <div className="chat-noise-overlay absolute inset-0 mix-blend-overlay" aria-hidden />
        </div>

        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center px-3 md:max-w-3xl md:px-4">
          <div
            className="chat-hero-animate mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary shadow-gamefik backdrop-blur-md"
            style={{ fontSize: "0.75rem" }}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Gamefik IA
          </div>

          <h1 className="chat-hero-animate chat-hero-delay-1 font-heading mb-3 max-w-[20ch] text-center text-3xl font-bold leading-tight tracking-tight text-foreground drop-shadow-[0_2px_24px_rgba(0,0,0,0.12)] md:max-w-none md:text-4xl">
            O que vamos{" "}
            <span className="bg-gradient-to-r from-primary via-[oklch(0.55_0.18_280)] to-primary bg-clip-text text-transparent">
              criar hoje?
            </span>
          </h1>

          <p className="chat-hero-animate chat-hero-delay-2 mb-7 max-w-lg text-center text-sm font-medium leading-relaxed text-muted-foreground drop-shadow-sm md:text-[0.9375rem]">
            Descreva um tema, cole um texto ou anexe material — a IA monta sua atividade educacional em segundos.
          </p>

          <form onSubmit={handleSubmit} className="chat-hero-animate chat-hero-delay-3 relative z-20 w-full">
            <div
              className="pointer-events-none absolute -inset-3 rounded-[1.35rem] blur-2xl motion-reduce:animate-none animate-pulse-glow"
              style={{
                background:
                  "linear-gradient(135deg, rgba(103,232,249,0.35), rgba(167,139,250,0.35), rgba(240,171,252,0.3), rgba(253,224,71,0.28))",
              }}
              aria-hidden
            />
            <div
              className="relative rounded-2xl p-[2px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]"
              style={{
                background: "linear-gradient(135deg, #67e8f9, #a78bfa, #f0abfc, #fde047)",
              }}
            >
              <div className="rounded-[14px] bg-card/95 shadow-inner backdrop-blur-md">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-b border-border/80 px-4 py-3">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-1.5"
                      >
                        {attachment.type === "pdf" ? (
                          <FileText className="h-4 w-4 text-destructive" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-primary" />
                        )}
                        <span className="max-w-32 truncate text-xs font-medium text-foreground" style={{ fontSize: "0.75rem" }}>
                          {attachment.name}
                        </span>
                        <span className="text-xs text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                          ({attachment.size})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Quiz sobre fotossintese para o 7o ano, com 5 questoes de multipla escolha..."
                  rows={3}
                  className="w-full resize-none rounded-t-[14px] bg-transparent px-5 py-4 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                  style={{ fontSize: "0.875rem" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />

                <div className="flex flex-col gap-3 border-t border-border/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                    >
                      <Paperclip className="h-4 w-4" aria-hidden />
                      <span className="text-xs font-semibold" style={{ fontSize: "0.75rem" }}>
                        Anexar
                      </span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="hidden text-xs text-muted-foreground sm:inline" style={{ fontSize: "0.75rem" }}>
                      Enter para enviar
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cn(
                      "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-300 ease-out sm:w-auto",
                      canSubmit
                        ? "text-white shadow-[0_8px_32px_rgba(103,232,249,0.35),0_4px_16px_rgba(240,171,252,0.25)] hover:shadow-[0_12px_48px_rgba(103,232,249,0.45),0_8px_24px_rgba(240,171,252,0.35)] hover:scale-[1.03] active:scale-[0.97] motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
                        : "cursor-not-allowed bg-muted text-muted-foreground"
                    )}
                    style={
                      canSubmit
                        ? { background: "linear-gradient(135deg, #67e8f9 0%, #a78bfa 35%, #f0abfc 65%, #fde047 100%)" }
                        : undefined
                    }
                  >
                    {canSubmit && (
                      <span
                        className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        style={{
                          background: "linear-gradient(135deg, #fde047 0%, #f0abfc 35%, #a78bfa 65%, #67e8f9 100%)",
                        }}
                      />
                    )}
                    {canSubmit && (
                      <span className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-full motion-reduce:transition-none" />
                    )}
                    {canSubmit && (
                      <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-400/40 via-fuchsia-400/40 to-yellow-400/40 opacity-75 blur-lg animate-pulse motion-reduce:animate-none" />
                    )}
                    {canSubmit && (
                      <span className="absolute inset-px rounded-[15px] bg-gradient-to-b from-white/25 to-transparent" />
                    )}
                    <span
                      className={cn("cta-sparkle relative shrink-0", canSubmit && "cta-sparkle--motion")}
                      aria-hidden
                    >
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="relative" style={{ fontSize: "0.875rem" }}>
                      Criar com IA
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="chat-hero-animate chat-hero-delay-4 mt-8 flex flex-col items-center gap-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden />
            <p className="text-center text-xs font-medium text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              Gamefik IA · Criacao inteligente de atividades educacionais
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Editor Panel
  const renderQuizEditor = () => {
    const q = quizQuestions[currentQuestion]

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-border px-6 pt-1">
          <button
            onClick={() => setQuizTab("informacoes")}
            className={cn(
              "border-b-2 pb-3 pt-2 text-sm font-medium transition-colors",
              quizTab === "informacoes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Informacoes
          </button>
          <button
            onClick={() => setQuizTab("questoes")}
            className={cn(
              "border-b-2 pb-3 pt-2 text-sm font-medium transition-colors",
              quizTab === "questoes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Questoes ({quizQuestions.length})
          </button>
        </div>

        {quizTab === "questoes" ? (
          <div className="flex-1 overflow-auto">
            {/* Question chips */}
            <div className="flex items-center gap-2 border-b border-border px-6 py-3">
              <div className="flex items-center gap-1.5">
                {quizQuestions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestion(i)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      i === currentQuestion ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    Q{i + 1}
                  </button>
                ))}
              </div>
              <button onClick={addQuestion} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Adicionar questao">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-2">
              <p className="text-xs text-muted-foreground">
                {quizQuestions.length} questoes · Hover para excluir
              </p>
            </div>

            {/* Question content */}
            <div className="px-6 py-4">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm font-semibold text-primary">
                  Questao {currentQuestion + 1}{" "}
                  <span className="font-normal text-muted-foreground">de {quizQuestions.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentQuestion(Math.min(quizQuestions.length - 1, currentQuestion + 1))}
                    disabled={currentQuestion === quizQuestions.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-40"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Enunciado - Rich text editor */}
              <div className="mb-6">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Enunciado
                </label>
                <div className="overflow-hidden rounded-lg border border-border bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-all">
                  {/* Toolbar */}
                  <div className="flex items-center gap-0.5 border-b border-border px-3 py-2">
                    <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Negrito">
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Italico">
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <div className="mx-1.5 h-5 w-px bg-border" />
                    <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Inserir imagem">
                      <ImageIcon className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Inserir video">
                      <Video className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Editable area */}
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateEnunciado(currentQuestion, e.currentTarget.textContent || "")}
                    className="min-h-[80px] px-4 py-3 text-sm text-foreground outline-none"
                    dangerouslySetInnerHTML={{ __html: q.enunciado }}
                  />
                </div>
              </div>

              {/* Alternatives */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Alternativas
                  </label>
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    clique no circulo para marcar correta
                  </span>
                </div>

                <div className="space-y-2">
                  {q.alternatives.map((alt, altIndex) => (
                    <div key={altIndex} className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors", alt.correct ? "border-emerald-300 bg-emerald-50" : "border-border bg-card")}>
                      <button
                        onClick={() => toggleCorrectAnswer(currentQuestion, altIndex)}
                        className="shrink-0"
                      >
                        {alt.correct ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </button>
                      <span className={cn("shrink-0 text-sm font-semibold", alt.correct ? "text-emerald-700" : "text-muted-foreground")}>
                        {alt.label}
                      </span>
                      <input
                        type="text"
                        value={alt.text}
                        onChange={(e) => updateAlternativeText(currentQuestion, altIndex, e.target.value)}
                        className="flex-1 bg-transparent text-sm text-foreground outline-none"
                      />
                      <button onClick={() => removeAlternative(currentQuestion, altIndex)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors" title="Remover alternativa">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button onClick={() => addAlternative(currentQuestion)} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <Plus className="h-4 w-4" />
                  Adicionar alternativa
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Informacoes tab - basic quiz info */
          <div className="flex-1 overflow-auto px-6 py-6">
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titulo</label>
              <input type="text" defaultValue="Quiz: Fracoes para o 6o Ano" className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descricao</label>
              <textarea defaultValue="Questoes sobre fracoes equivalentes e operacoes basicas com fracoes." rows={3} className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagem de capa</label>
              <div className="flex h-28 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-sidebar-accent/50">
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-xs">Adicionar imagem de capa</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Mission Editor Panel
  const renderMissionEditor = () => {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Single tab - Detalhes only */}
        <div className="flex items-center gap-6 border-b border-border px-6 pt-1">
          <button className="border-b-2 border-primary pb-3 pt-2 text-sm font-medium text-primary">
            Detalhes
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          {/* Cover image */}
          <div className="mb-6">
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-sidebar-accent/50 cursor-pointer">
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className="h-6 w-6" />
                <span className="text-xs">Adicionar imagem de capa</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titulo</label>
            <input
              type="text"
              value={missionTitle}
              onChange={(e) => setMissionTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* Description - Rich text editor with media insertion */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descricao
            </label>
            <div className="overflow-hidden rounded-lg border border-border bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-all">
              {/* Toolbar */}
              <div className="flex items-center gap-0.5 border-b border-border px-3 py-2">
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Negrito">
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Italico">
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <div className="mx-1.5 h-5 w-px bg-border" />
                <button type="button" className="flex h-7 items-center gap-1.5 rounded px-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Inserir foto">
                  <Camera className="h-3.5 w-3.5" />
                  <span className="text-xs">Foto</span>
                </button>
                <button type="button" className="flex h-7 items-center gap-1.5 rounded px-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Inserir video">
                  <Video className="h-3.5 w-3.5" />
                  <span className="text-xs">Video</span>
                </button>
                <button type="button" className="flex h-7 items-center gap-1.5 rounded px-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors" title="Inserir PDF">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs">PDF</span>
                </button>
              </div>
              {/* Editable area */}
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[180px] px-4 py-3 text-sm text-foreground outline-none"
                dangerouslySetInnerHTML={{ __html: missionDesc }}
              />
            </div>
          </div>

          {/* Proof type and validation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo de comprovante
              </label>
              <FilterDropdown
                label="Tipo"
                options={[
                  { value: "foto", label: "Foto", description: "Imagem como comprovante" },
                  { value: "video", label: "Video", description: "Gravacao de video" },
                  { value: "texto", label: "Texto", description: "Resposta escrita" },
                  { value: "arquivo", label: "Arquivo", description: "PDF ou documento" },
                ]}
                value={missionProofType}
                onChange={(v) => setMissionProofType(v as string)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Validacao
              </label>
              <FilterDropdown
                label="Validacao"
                options={[
                  { value: "ia", label: "IA Automatica", description: "Validacao por inteligencia artificial" },
                  { value: "manual", label: "Manual", description: "Professor valida manualmente" },
                  { value: "auto", label: "Auto-validacao", description: "Aluno confirma conclusao" },
                ]}
                value={missionValidation}
                onChange={(v) => setMissionValidation(v as string)}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Phone Preview Panel
  const renderPhonePreview = () => (
    <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-6">
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Visualizacao no app — como o aluno vera
      </p>
      <div className="w-full max-w-[340px]">
        <div className="overflow-hidden rounded-[3rem] border-[12px] border-gray-900 bg-gray-900 shadow-2xl">
          {/* Status Bar */}
          <div className="flex items-center justify-between bg-primary px-4 py-2">
            <span className="text-xs font-medium text-white">9:41</span>
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-5 rounded-sm border border-white/50 bg-white/20" />
              <div className="h-2.5 w-2.5 rounded-full border border-white/50 bg-white/20" />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-white">
              <span>AAA</span>
              <Zap className="h-3 w-3" />
            </div>
          </div>

          <div className="bg-white">
            <div className="relative h-44 bg-gradient-to-br from-amber-400 to-orange-500">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-3">
                  <div className="h-24 w-24 rounded-xl bg-white/20" />
                  <div className="h-24 w-24 rounded-xl bg-white/20" />
                </div>
              </div>
            </div>

            <div className="p-5">
              <h3 className="mb-3 text-center text-lg font-bold text-gray-900">
                {activityType === "quiz" ? "Quiz: Fracoes para o 6o Ano" : missionTitle}
              </h3>

              <div className="mb-4 flex items-center justify-center gap-3">
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  50
                </span>
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">
                  <Zap className="h-3.5 w-3.5" />
                  100
                </span>
              </div>

              <div className="mb-4 flex items-center gap-2">
                <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
                  <img 
                    src="/images/characters.png" 
                    alt="Professor" 
                    className="absolute -top-0.5 left-1/2 h-9 w-auto -translate-x-1/2 object-cover"
                    style={{ objectPosition: 'center 10%' }}
                  />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Criado por</p>
                  <p className="text-sm font-medium text-gray-900">Professor Gamefik</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-900">Descricao</p>
                <p className="text-sm text-gray-600">
                  {activityType === "quiz"
                    ? "Questoes sobre fracoes equivalentes e operacoes basicas com fracoes."
                    : missionDesc}
                </p>
              </div>

              <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
                  <img 
                    src="/images/characters.png" 
                    alt="Dica" 
                    className="absolute top-0 left-1/2 h-7 w-auto -translate-x-1/2 object-cover"
                    style={{ objectPosition: 'center 10%' }}
                  />
                </div>
                <p className="text-xs text-amber-800">
                  {activityType === "quiz"
                    ? "Faca os Quizzes com atencao pois ao final voce ira ganhar moedas proporcional aos acertos!"
                    : "Complete a missao enviando o comprovante solicitado!"}
                </p>
              </div>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-white">
                {activityType === "quiz" ? "Jogar este Quiz" : "Iniciar Missao"}
                <Play className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex justify-center bg-white py-2">
            <div className="h-1 w-28 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>
    </div>
  )

  // Activity Creation View
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold text-foreground">Nova atividade</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activityType === "quiz" ? (
            <span className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700">
              <Gamepad2 className="h-3.5 w-3.5" />
              Quiz
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <ClipboardList className="h-3.5 w-3.5" />
              Missao
            </span>
          )}
          <p className="hidden text-xs text-muted-foreground md:block">
            Tipo detectado automaticamente pela IA
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Chat Panel */}
        <div className="flex w-[380px] flex-col border-r border-border bg-card">
          {/* Recent Activity Sidebar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historico</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="h-8 w-32 rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {/* Activity List */}
          <div className="border-b border-border">
            <div className="flex flex-col gap-0.5 p-2">
              {recentActivities
                .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((activity) => (
                  <button
                    key={activity.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    {activity.type === "quiz" ? (
                      <Gamepad2 className="h-4 w-4 shrink-0 text-orange-500" />
                    ) : (
                      <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.date}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                  {msg.role === "ai" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                    msg.role === "ai" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Quick Chips */}
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            {quickChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleQuickChip(chip)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-sidebar-accent transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5">
                    {attachment.type === "pdf" ? <FileText className="h-3.5 w-3.5 text-destructive" /> : <ImageIcon className="h-3.5 w-3.5 text-primary" />}
                    <span className="max-w-24 truncate text-xs font-medium">{attachment.name}</span>
                    <button type="button" onClick={() => removeAttachment(attachment.id)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors">
                <Paperclip className="h-4 w-4" />
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,image/*" multiple onChange={handleFileSelect} className="hidden" />
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva sua atividade..."
                className="h-10 flex-1 rounded-lg border border-border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ease-out",
                  canSubmit 
                    ? "bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95" 
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {/* Glow effect */}
                {canSubmit && (
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/60 to-transparent opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
                )}
                {/* Shine effect */}
                {canSubmit && (
                  <span className="absolute inset-0 rounded-xl overflow-hidden">
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
                  </span>
                )}
                {/* Ring pulse animation */}
                {canSubmit && (
                  <span className="absolute inset-0 rounded-xl ring-2 ring-primary/50 animate-pulse" />
                )}
                <Send className={cn(
                  "relative h-4 w-4 transition-transform duration-300",
                  canSubmit && "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                )} />
              </button>
            </div>
          </form>
        </div>

        {/* Right: Editor/Preview Panel */}
        <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setRightPanel("editor")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  rightPanel === "editor" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar atividade
              </button>
              <button
                onClick={() => setRightPanel("preview")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  rightPanel === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                Pre-visualizar
              </button>
            </div>
          </div>

          {/* Panel Content */}
          {rightPanel === "editor" ? (
            activityType === "quiz" ? renderQuizEditor() : renderMissionEditor()
          ) : (
            renderPhonePreview()
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
        <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors">
          <Save className="h-4 w-4" />
          Salvar rascunho
        </button>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowClassDropdown(!showClassDropdown)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              Todas as turmas
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showClassDropdown && "rotate-180")} />
            </button>
            {showClassDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowClassDropdown(false)} />
                <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-border bg-card p-1 shadow-lg">
                  {["Todas as turmas", "6o Ano A", "6o Ano B", "7o Ano A"].map((turma) => (
                    <button
                      key={turma}
                      onClick={() => setShowClassDropdown(false)}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent transition-colors"
                    >
                      {turma}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            <Zap className="h-4 w-4" />
            Publicar atividade
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
