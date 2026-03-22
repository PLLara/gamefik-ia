"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  Eye,
  FileText,
  Gamepad2,
  ImageIcon,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { FilterDropdown } from "@/components/filter-dropdown"
import { cn } from "@/lib/utils"
import {
  activitySchema,
  classroomOptions,
  createEmptyQuizQuestion,
  createEntityId,
  createStoredActivityRecord,
  isMissionActivity,
  isQuizActivity,
  relabelAlternatives,
  storedActivityRecordSchema,
  type Activity,
  type ActivityStatus,
  type MissionActivity,
  type MissionProofType,
  type MissionValidation,
  type QuizActivity,
  type QuizQuestion,
  type StoredActivityRecord,
} from "@/lib/activity-schema"

type ViewMode = "initial" | "creating"
type RightPanelView = "preview" | "editor"
type QuizTab = "informacoes" | "questoes"
type GenerationState = "idle" | "loading" | "error"

type ChatMessage = {
  id: string
  role: "ai" | "user"
  content: string
}

type UploadedAttachment = {
  id: string
  file: File
  name: string
  type: "pdf" | "image"
  sizeLabel: string
}

const storageKey = "gamefik-manager.activities.v1"

const welcomeMessage: ChatMessage = {
  id: "welcome-message",
  role: "ai",
  content:
    "Ola! Descreva a atividade que voce quer criar ou envie materiais em PDF/imagem. Eu gero um quiz ou uma missao completos para voce.",
}

const quickChips = [
  "Quiz sobre fotossintese para o 7o ano com 5 questoes",
  "Missao de leitura com comprovante em foto",
  "Atividade baseada no material anexado",
  "Quiz de revisao antes da prova",
]

const seedStoredActivities: StoredActivityRecord[] = [
  {
    activity: {
      id: "seed-quiz-fracoes",
      type: "quiz",
      title: "Quiz: Fracoes para o 6o Ano",
      description: "Revise fracoes equivalentes, comparacao e operacoes basicas.",
      teacherMessage:
        "Resolva com calma e confira cada alternativa antes de responder.",
      attachmentContext: ["Resumo de fracoes", "Lista de exercicios basicos"],
      quizQuestions: [
        {
          id: "seed-question-1",
          enunciado: "Qual fracao e equivalente a 1/2?",
          points: 10,
          alternatives: [
            { id: "seed-q1-a", label: "A", text: "2/6", correct: false },
            { id: "seed-q1-b", label: "B", text: "3/6", correct: true },
            { id: "seed-q1-c", label: "C", text: "1/3", correct: false },
            { id: "seed-q1-d", label: "D", text: "4/10", correct: false },
          ],
        },
        {
          id: "seed-question-2",
          enunciado: "Quanto e 1/2 + 1/4?",
          points: 10,
          alternatives: [
            { id: "seed-q2-a", label: "A", text: "2/4", correct: false },
            { id: "seed-q2-b", label: "B", text: "3/4", correct: true },
            { id: "seed-q2-c", label: "C", text: "1/4", correct: false },
            { id: "seed-q2-d", label: "D", text: "4/4", correct: false },
          ],
        },
      ],
    },
    status: "draft",
    classroom: "6o Ano A",
    createdAt: "2026-03-21T14:30:00.000Z",
    updatedAt: "2026-03-21T15:10:00.000Z",
    publishedAt: null,
  },
  {
    activity: {
      id: "seed-missao-leitura",
      type: "missao",
      title: "Missao: Leitura e Reflexao",
      description:
        "Leia o capitulo 3 do livro e escreva um paragrafo explicando a principal ideia apresentada.",
      teacherMessage:
        "Capriche na explicacao e use exemplos do texto para sustentar sua resposta.",
      attachmentContext: ["Capitulo 3 do livro", "Roteiro de reflexao"],
      missionProofType: "texto",
      missionValidation: "manual",
    },
    status: "published",
    classroom: "7o Ano A",
    createdAt: "2026-03-20T09:00:00.000Z",
    updatedAt: "2026-03-20T10:15:00.000Z",
    publishedAt: "2026-03-20T10:15:00.000Z",
  },
]

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatHistoryDate(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(isoDate))
}

function cloneActivity(activity: Activity) {
  if (typeof structuredClone === "function") {
    return structuredClone(activity)
  }

  return JSON.parse(JSON.stringify(activity)) as Activity
}

function sortStoredActivities(records: StoredActivityRecord[]) {
  return [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function loadStoredActivities() {
  if (typeof window === "undefined") {
    return seedStoredActivities
  }

  const storedValue = window.localStorage.getItem(storageKey)

  if (!storedValue) {
    return seedStoredActivities
  }

  try {
    const parsedValue = JSON.parse(storedValue)
    const parsedRecords = storedActivityRecordSchema.array().safeParse(parsedValue)

    if (!parsedRecords.success || parsedRecords.data.length === 0) {
      return seedStoredActivities
    }

    return sortStoredActivities(parsedRecords.data)
  } catch {
    return seedStoredActivities
  }
}

function persistStoredActivities(records: StoredActivityRecord[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(records))
}

function buildUserMessage(prompt: string, attachments: UploadedAttachment[]) {
  const trimmedPrompt = prompt.trim()

  if (trimmedPrompt.length > 0) {
    return trimmedPrompt
  }

  if (attachments.length === 1) {
    return `Gerar atividade a partir do anexo "${attachments[0].name}".`
  }

  return `Gerar atividade usando ${attachments.length} anexos enviados.`
}

function getClassroomLabel(value: string | null) {
  return value ?? classroomOptions[0]
}

export default function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("initial")
  const [rightPanel, setRightPanel] = useState<RightPanelView>("editor")
  const [quizTab, setQuizTab] = useState<QuizTab>("questoes")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])
  const [generationState, setGenerationState] = useState<GenerationState>("idle")
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [recentActivities, setRecentActivities] = useState<StoredActivityRecord[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>(classroomOptions[0])
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const [currentModel, setCurrentModel] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const currentQuiz = isQuizActivity(currentActivity) ? currentActivity : null
  const currentMission = isMissionActivity(currentActivity) ? currentActivity : null
  const canSubmit =
    generationState !== "loading" &&
    (message.trim().length > 0 || attachments.length > 0)

  const filteredActivities = useMemo(
    () =>
      recentActivities.filter((record) =>
        record.activity.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [recentActivities, searchQuery]
  )

  useEffect(() => {
    setRecentActivities(loadStoredActivities())
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  useEffect(() => {
    if (!currentQuiz) {
      return
    }

    if (currentQuestion > currentQuiz.quizQuestions.length - 1) {
      setCurrentQuestion(Math.max(0, currentQuiz.quizQuestions.length - 1))
    }
  }, [currentQuestion, currentQuiz])

  const updateActivity = (updater: (activity: Activity) => Activity) => {
    setCurrentActivity((previousActivity) => {
      if (!previousActivity) {
        return previousActivity
      }

      return updater(previousActivity)
    })
  }

  const replaceAssistantMessage = (messageId: string, content: string) => {
    setMessages((previousMessages) =>
      previousMessages.map((entry) =>
        entry.id === messageId ? { ...entry, content } : entry
      )
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    const prompt = message.trim()
    const userMessage: ChatMessage = {
      id: createEntityId("message"),
      role: "user",
      content: buildUserMessage(prompt, attachments),
    }
    const pendingMessageId = createEntityId("message")

    setMessages((previousMessages) => [
      ...previousMessages,
      userMessage,
      {
        id: pendingMessageId,
        role: "ai",
        content: "Gerando atividade com o Gemini...",
      },
    ])
    setGenerationState("loading")
    setGenerationError(null)

    try {
      const formData = new FormData()
      formData.append("prompt", prompt)

      attachments.forEach((attachment) => {
        formData.append("attachments", attachment.file, attachment.name)
      })

      const response = await fetch("/api/generate-activity", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json()) as {
        activity?: unknown
        error?: string
        model?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel gerar a atividade.")
      }

      const generatedActivity = activitySchema.parse(payload.activity)

      setCurrentActivity(generatedActivity)
      setCurrentQuestion(0)
      setQuizTab(generatedActivity.type === "quiz" ? "questoes" : "informacoes")
      setViewMode("creating")
      setRightPanel("editor")
      setActiveRecordId(generatedActivity.id)
      setCurrentModel(typeof payload.model === "string" ? payload.model : null)
      setSelectedClassroom(classroomOptions[0])
      setGenerationState("idle")
      replaceAssistantMessage(pendingMessageId, generatedActivity.teacherMessage)
      toast.success("Atividade gerada com sucesso.")
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar a atividade no momento."

      setGenerationState("error")
      setGenerationError(errorMessage)
      replaceAssistantMessage(pendingMessageId, errorMessage)
      toast.error(errorMessage)
    } finally {
      setMessage("")
      setAttachments([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleQuickChip = (chip: string) => {
    setMessage(chip)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files

    if (!selectedFiles) {
      return
    }

    const nextAttachments: UploadedAttachment[] = []

    Array.from(selectedFiles).forEach((file) => {
      const isPdf = file.type === "application/pdf"
      const isImage = file.type.startsWith("image/")

      if (!isPdf && !isImage) {
        toast.error(`O arquivo "${file.name}" nao e suportado.`)
        return
      }

      nextAttachments.push({
        id: createEntityId("attachment"),
        file,
        name: file.name,
        type: isPdf ? "pdf" : "image",
        sizeLabel: formatFileSize(file.size),
      })
    })

    if (nextAttachments.length > 0) {
      setAttachments((previousAttachments) => [...previousAttachments, ...nextAttachments])
    }

    event.target.value = ""
  }

  const removeAttachment = (attachmentId: string) => {
    setAttachments((previousAttachments) =>
      previousAttachments.filter((attachment) => attachment.id !== attachmentId)
    )
  }

  const handleBack = () => {
    setViewMode("initial")
    setRightPanel("editor")
    setCurrentQuestion(0)
    setGenerationError(null)
    setCurrentModel(null)
  }

  const updateQuiz = (updater: (activity: QuizActivity) => QuizActivity) => {
    updateActivity((activity) => {
      if (!isQuizActivity(activity)) {
        return activity
      }

      return updater(activity)
    })
  }

  const updateQuizQuestion = (
    questionIndex: number,
    updater: (question: QuizQuestion) => QuizQuestion
  ) => {
    updateQuiz((activity) => ({
      ...activity,
      quizQuestions: activity.quizQuestions.map((question, index) =>
        index === questionIndex ? updater(question) : question
      ),
    }))
  }

  const updateQuizTextField = (field: "title" | "description" | "teacherMessage", value: string) => {
    updateQuiz((activity) => ({
      ...activity,
      [field]: value,
    }))
  }

  const updateMissionField = <
    TField extends keyof Pick<
      MissionActivity,
      "title" | "description" | "teacherMessage" | "missionProofType" | "missionValidation"
    >
  >(
    field: TField,
    value: MissionActivity[TField]
  ) => {
    updateActivity((activity) => {
      if (!isMissionActivity(activity)) {
        return activity
      }

      return {
        ...activity,
        [field]: value,
      }
    })
  }

  const toggleCorrectAnswer = (questionIndex: number, alternativeIndex: number) => {
    updateQuizQuestion(questionIndex, (question) => ({
      ...question,
      alternatives: question.alternatives.map((alternative, index) => ({
        ...alternative,
        correct: index === alternativeIndex,
      })),
    }))
  }

  const updateAlternativeText = (questionIndex: number, alternativeIndex: number, text: string) => {
    updateQuizQuestion(questionIndex, (question) => ({
      ...question,
      alternatives: question.alternatives.map((alternative, index) =>
        index === alternativeIndex ? { ...alternative, text } : alternative
      ),
    }))
  }

  const updateEnunciado = (questionIndex: number, text: string) => {
    updateQuizQuestion(questionIndex, (question) => ({
      ...question,
      enunciado: text,
    }))
  }

  const updatePoints = (questionIndex: number, points: number) => {
    updateQuizQuestion(questionIndex, (question) => ({
      ...question,
      points,
    }))
  }

  const addQuestion = () => {
    updateQuiz((activity) => {
      if (activity.quizQuestions.length >= 10) {
        toast.error("O quiz pode ter no maximo 10 questoes.")
        return activity
      }

      const nextQuestion = createEmptyQuizQuestion()
      setCurrentQuestion(activity.quizQuestions.length)

      return {
        ...activity,
        quizQuestions: [...activity.quizQuestions, nextQuestion],
      }
    })
  }

  const removeQuestion = (questionIndex: number) => {
    updateQuiz((activity) => {
      if (activity.quizQuestions.length <= 1) {
        toast.error("O quiz precisa ter pelo menos uma questao.")
        return activity
      }

      const nextQuestions = activity.quizQuestions.filter((_, index) => index !== questionIndex)
      setCurrentQuestion((previousQuestion) =>
        Math.min(previousQuestion, Math.max(0, nextQuestions.length - 1))
      )

      return {
        ...activity,
        quizQuestions: nextQuestions,
      }
    })
  }

  const addAlternative = (questionIndex: number) => {
    updateQuizQuestion(questionIndex, (question) => {
      if (question.alternatives.length >= 6) {
        toast.error("Cada questao pode ter no maximo 6 alternativas.")
        return question
      }

      return {
        ...question,
        alternatives: relabelAlternatives([
          ...question.alternatives,
          {
            id: createEntityId("alternative"),
            text: "",
            correct: false,
          },
        ]),
      }
    })
  }

  const removeAlternative = (questionIndex: number, alternativeIndex: number) => {
    updateQuizQuestion(questionIndex, (question) => {
      if (question.alternatives.length <= 2) {
        toast.error("Cada questao precisa ter ao menos 2 alternativas.")
        return question
      }

      const remainingAlternatives = question.alternatives.filter(
        (_, index) => index !== alternativeIndex
      )
      const hasCorrectAnswer = remainingAlternatives.some((alternative) => alternative.correct)
      const normalizedAlternatives = relabelAlternatives(
        remainingAlternatives.map((alternative, index) => ({
          id: alternative.id,
          text: alternative.text,
          correct: hasCorrectAnswer ? alternative.correct : index === 0,
        }))
      )

      return {
        ...question,
        alternatives: normalizedAlternatives,
      }
    })
  }

  const handleSelectClassroom = (classroom: string) => {
    setSelectedClassroom(classroom)
    setShowClassDropdown(false)
  }

  const loadActivityRecord = (record: StoredActivityRecord) => {
    setCurrentActivity(cloneActivity(record.activity))
    setSelectedClassroom(getClassroomLabel(record.classroom))
    setViewMode("creating")
    setRightPanel("editor")
    setCurrentQuestion(0)
    setQuizTab(record.activity.type === "quiz" ? "questoes" : "informacoes")
    setActiveRecordId(record.activity.id)
    setGenerationError(null)
    setMessages([
      welcomeMessage,
      {
        id: createEntityId("message"),
        role: "ai",
        content: `Carreguei "${record.activity.title}" para voce continuar editando.`,
      },
    ])
    toast.success(`"${record.activity.title}" carregada.`)
  }

  const saveCurrentActivity = (status: ActivityStatus) => {
    if (!currentActivity) {
      toast.error("Gere ou carregue uma atividade antes de salvar.")
      return
    }

    try {
      const validatedActivity = activitySchema.parse(currentActivity)
      const existingRecord = recentActivities.find(
        (record) => record.activity.id === validatedActivity.id
      )
      const classroom =
        selectedClassroom === classroomOptions[0] ? null : selectedClassroom
      const nextRecord = createStoredActivityRecord(
        cloneActivity(validatedActivity),
        status,
        classroom,
        existingRecord
      )
      const nextRecords = sortStoredActivities([
        nextRecord,
        ...recentActivities.filter((record) => record.activity.id !== validatedActivity.id),
      ])

      setRecentActivities(nextRecords)
      setActiveRecordId(validatedActivity.id)
      persistStoredActivities(nextRecords)
      toast.success(
        status === "draft"
          ? "Rascunho salvo com sucesso."
          : "Atividade publicada com sucesso."
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? "Preencha todos os campos obrigatorios antes de salvar."
          : "Nao foi possivel salvar a atividade."

      toast.error(errorMessage)
    }
  }

  const renderInitialView = () => (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
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
        <div className="absolute -left-24 top-[12%] h-[22rem] w-[22rem] rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute -right-20 bottom-[18%] h-[20rem] w-[20rem] rounded-full bg-primary/20 blur-[90px]" />
        <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-[48%] rounded-full bg-[oklch(0.88_0.12_165_/_0.12)] blur-[110px]" />
        <div className="chat-noise-overlay absolute inset-0 mix-blend-overlay" aria-hidden />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center px-3 md:max-w-3xl md:px-4">
        <div className="chat-hero-animate mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary shadow-gamefik backdrop-blur-md">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Gamefik IA + Gemini
        </div>

        <h1 className="chat-hero-animate chat-hero-delay-1 font-heading mb-3 max-w-[20ch] text-center text-3xl font-bold leading-tight tracking-tight text-foreground drop-shadow-[0_2px_24px_rgba(0,0,0,0.12)] md:max-w-none md:text-4xl">
          O que vamos{" "}
          <span className="bg-gradient-to-r from-primary via-[oklch(0.55_0.18_280)] to-primary bg-clip-text text-transparent">
            criar hoje?
          </span>
        </h1>

        <p className="chat-hero-animate chat-hero-delay-2 mb-7 max-w-xl text-center text-sm font-medium leading-relaxed text-muted-foreground drop-shadow-sm md:text-[0.9375rem]">
          Descreva um tema, cole um texto ou anexe material. O Gemini gera um quiz ou uma missao prontos para editar, salvar e publicar.
        </p>

        <form onSubmit={handleSubmit} className="chat-hero-animate chat-hero-delay-3 relative z-20 w-full">
          <div
            className="pointer-events-none absolute -inset-3 rounded-[1.35rem] blur-2xl animate-pulse-glow"
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
                      <span className="max-w-40 truncate text-xs font-medium text-foreground">
                        {attachment.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({attachment.sizeLabel})
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
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ex: Quiz sobre fotossintese para o 7o ano com 5 questoes de multipla escolha..."
                rows={4}
                className="w-full resize-none rounded-t-[14px] bg-transparent px-5 py-4 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />

              {generationError && (
                <div className="mx-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {generationError}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-border/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                  >
                    <Paperclip className="h-4 w-4" aria-hidden />
                    <span className="text-xs font-semibold">Anexar PDF ou imagem</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {currentModel ? `Ultimo modelo: ${currentModel}` : "Gemini conectado"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-300 ease-out sm:w-auto",
                    canSubmit
                      ? "text-white shadow-[0_8px_32px_rgba(103,232,249,0.35),0_4px_16px_rgba(240,171,252,0.25)] hover:shadow-[0_12px_48px_rgba(103,232,249,0.45),0_8px_24px_rgba(240,171,252,0.35)] hover:scale-[1.03] active:scale-[0.97]"
                      : "cursor-not-allowed bg-muted text-muted-foreground"
                  )}
                  style={
                    canSubmit
                      ? {
                          background:
                            "linear-gradient(135deg, #67e8f9 0%, #a78bfa 35%, #f0abfc 65%, #fde047 100%)",
                        }
                      : undefined
                  }
                >
                  <Sparkles className="relative h-4 w-4" />
                  <span>{generationState === "loading" ? "Gerando..." : "Criar com IA"}</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="chat-hero-animate chat-hero-delay-4 mt-8 flex flex-wrap items-center justify-center gap-2">
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleQuickChip(chip)}
              className="rounded-full border border-primary/15 bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-card"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderQuizEditor = () => {
    if (!currentQuiz) {
      return null
    }

    const question = currentQuiz.quizQuestions[currentQuestion]

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-6 border-b border-border px-6 pt-1">
          <button
            type="button"
            onClick={() => setQuizTab("informacoes")}
            className={cn(
              "border-b-2 pb-3 pt-2 text-sm font-medium transition-colors",
              quizTab === "informacoes"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Informacoes
          </button>
          <button
            type="button"
            onClick={() => setQuizTab("questoes")}
            className={cn(
              "border-b-2 pb-3 pt-2 text-sm font-medium transition-colors",
              quizTab === "questoes"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Questoes ({currentQuiz.quizQuestions.length})
          </button>
        </div>

        {quizTab === "informacoes" ? (
          <div className="flex-1 overflow-auto px-6 py-6">
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Titulo
              </label>
              <input
                type="text"
                value={currentQuiz.title}
                onChange={(event) => updateQuizTextField("title", event.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descricao
              </label>
              <textarea
                value={currentQuiz.description}
                onChange={(event) => updateQuizTextField("description", event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mensagem do professor
              </label>
              <textarea
                value={currentQuiz.teacherMessage}
                onChange={(event) => updateQuizTextField("teacherMessage", event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contexto dos anexos
              </label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card px-4 py-4">
                {currentQuiz.attachmentContext.length > 0 ? (
                  currentQuiz.attachmentContext.map((contextItem) => (
                    <span
                      key={contextItem}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {contextItem}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Nenhum contexto de anexo foi usado nesta atividade.
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="flex items-center gap-2 border-b border-border px-6 py-3">
              <div className="flex items-center gap-1.5">
                {currentQuiz.quizQuestions.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentQuestion(index)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      index === currentQuestion
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    Q{index + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                title="Adicionar questao"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-primary">
                  Questao {currentQuestion + 1}{" "}
                  <span className="font-normal text-muted-foreground">
                    de {currentQuiz.quizQuestions.length}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestion(
                        Math.min(currentQuiz.quizQuestions.length - 1, currentQuestion + 1)
                      )
                    }
                    disabled={currentQuestion === currentQuiz.quizQuestions.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-40"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(currentQuestion)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Enunciado
                </label>
                <textarea
                  value={question.enunciado}
                  onChange={(event) => updateEnunciado(currentQuestion, event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pontos
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={question.points}
                  onChange={(event) =>
                    updatePoints(currentQuestion, Number(event.target.value || 0))
                  }
                  className="w-32 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Alternativas
                  </label>
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    clique no circulo para marcar a correta
                  </span>
                </div>

                <div className="space-y-2">
                  {question.alternatives.map((alternative, alternativeIndex) => (
                    <div
                      key={alternative.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                        alternative.correct
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-border bg-card"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCorrectAnswer(currentQuestion, alternativeIndex)}
                        className="shrink-0"
                      >
                        {alternative.correct ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
                        )}
                      </button>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold",
                          alternative.correct ? "text-emerald-700" : "text-muted-foreground"
                        )}
                      >
                        {alternative.label}
                      </span>
                      <input
                        type="text"
                        value={alternative.text}
                        onChange={(event) =>
                          updateAlternativeText(
                            currentQuestion,
                            alternativeIndex,
                            event.target.value
                          )
                        }
                        className="flex-1 bg-transparent text-sm text-foreground outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeAlternative(currentQuestion, alternativeIndex)}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                        title="Remover alternativa"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addAlternative(currentQuestion)}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar alternativa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderMissionEditor = () => {
    if (!currentMission) {
      return null
    }

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-6 border-b border-border px-6 pt-1">
          <button type="button" className="border-b-2 border-primary pb-3 pt-2 text-sm font-medium text-primary">
            Detalhes
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Titulo
            </label>
            <input
              type="text"
              value={currentMission.title}
              onChange={(event) => updateMissionField("title", event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descricao
            </label>
            <textarea
              value={currentMission.description}
              onChange={(event) => updateMissionField("description", event.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mensagem do professor
            </label>
            <textarea
              value={currentMission.teacherMessage}
              onChange={(event) => updateMissionField("teacherMessage", event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contexto dos anexos
            </label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card px-4 py-4">
              {currentMission.attachmentContext.length > 0 ? (
                currentMission.attachmentContext.map((contextItem) => (
                  <span
                    key={contextItem}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {contextItem}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  Nenhum contexto de anexo foi usado nesta atividade.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                value={currentMission.missionProofType}
                onChange={(value) =>
                  updateMissionField("missionProofType", value as MissionProofType)
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Validacao
              </label>
              <FilterDropdown
                label="Validacao"
                options={[
                  {
                    value: "ia",
                    label: "IA Automatica",
                    description: "Validacao por inteligencia artificial",
                  },
                  {
                    value: "manual",
                    label: "Manual",
                    description: "Professor valida manualmente",
                  },
                  {
                    value: "auto",
                    label: "Auto-validacao",
                    description: "Aluno confirma a conclusao",
                  },
                ]}
                value={currentMission.missionValidation}
                onChange={(value) =>
                  updateMissionField("missionValidation", value as MissionValidation)
                }
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPreview = () => {
    if (!currentActivity) {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm rounded-2xl border border-dashed border-border bg-card px-6 py-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Gere uma atividade para visualizar
            </h3>
            <p className="text-sm text-muted-foreground">
              Assim que o Gemini responder, a pre-visualizacao do aluno aparecera aqui.
            </p>
          </div>
        </div>
      )
    }

    const quizQuestionCount = currentQuiz?.quizQuestions.length ?? 0
    const quizTotalPoints =
      currentQuiz?.quizQuestions.reduce((total, question) => total + question.points, 0) ?? 0
    const previewQuestion = currentQuiz?.quizQuestions[0] ?? null

    return (
      <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-6">
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Visualizacao no app — como o aluno vera
        </p>
        <div className="w-full max-w-[340px]">
          <div className="overflow-hidden rounded-[3rem] border-[12px] border-gray-900 bg-gray-900 shadow-2xl">
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
                  <Image
                    src="/images/chat-background.jpg"
                    alt=""
                    fill
                    className="object-cover opacity-35"
                  />
                </div>
              </div>

              <div className="p-5">
                <h3 className="mb-3 text-center text-lg font-bold text-gray-900">
                  {currentActivity.title}
                </h3>

                <div className="mb-4 flex items-center justify-center gap-3">
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    {currentActivity.type === "quiz" ? (
                      <Gamepad2 className="h-3.5 w-3.5" />
                    ) : (
                      <ClipboardList className="h-3.5 w-3.5" />
                    )}
                    {currentActivity.type === "quiz"
                      ? `${quizQuestionCount} questoes`
                      : currentMission?.missionProofType.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700">
                    <Zap className="h-3.5 w-3.5" />
                    {currentActivity.type === "quiz"
                      ? `${quizTotalPoints} pts`
                      : currentMission?.missionValidation.toUpperCase()}
                  </span>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
                    <Image
                      src="/images/characters.png"
                      alt="Professor"
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Criado por</p>
                    <p className="text-sm font-medium text-gray-900">Professor Gamefik</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-900">Descricao</p>
                  <p className="text-sm text-gray-600">{currentActivity.description}</p>
                </div>

                {currentActivity.attachmentContext.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {currentActivity.attachmentContext.map((contextItem) => (
                      <span
                        key={contextItem}
                        className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-700"
                      >
                        {contextItem}
                      </span>
                    ))}
                  </div>
                )}

                {currentActivity.type === "quiz" && previewQuestion ? (
                  <div className="mb-5 rounded-xl bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-900">
                      Questao 1
                    </p>
                    <p className="mb-3 text-sm text-slate-700">{previewQuestion.enunciado}</p>
                    <div className="space-y-2">
                      {previewQuestion.alternatives.map((alternative) => (
                        <div
                          key={alternative.id}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                          <span className="mr-2 font-semibold">{alternative.label}.</span>
                          {alternative.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
                      <Image
                        src="/images/characters.png"
                        alt="Dica"
                        fill
                        className="object-cover"
                        sizes="24px"
                      />
                    </div>
                    <p className="text-xs text-amber-800">{currentActivity.teacherMessage}</p>
                  </div>
                )}

                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-white">
                  {currentActivity.type === "quiz" ? "Jogar este Quiz" : "Iniciar Missao"}
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
  }

  if (viewMode === "initial") {
    return renderInitialView()
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold text-foreground">Nova atividade</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentActivity?.type === "quiz" ? (
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
            {currentModel ? `Gerado por ${currentModel}` : "Atividade pronta para editar"}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[390px] flex-col border-r border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Historico
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar..."
                className="h-8 w-36 rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div className="border-b border-border">
            <div className="flex max-h-56 flex-col gap-1 overflow-auto p-2">
              {filteredActivities.length > 0 ? (
                filteredActivities.map((record) => (
                  <button
                    key={record.activity.id}
                    type="button"
                    onClick={() => loadActivityRecord(record)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      activeRecordId === record.activity.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    {record.activity.type === "quiz" ? (
                      <Gamepad2 className="h-4 w-4 shrink-0 text-orange-500" />
                    ) : (
                      <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{record.activity.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{formatHistoryDate(record.updatedAt)}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-semibold",
                            record.status === "published"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          )}
                        >
                          {record.status === "published" ? "Publicado" : "Rascunho"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-5 text-center text-sm text-muted-foreground">
                  Nenhuma atividade encontrada.
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="flex flex-col gap-4">
              {messages.map((entry) => (
                <div
                  key={entry.id}
                  className={cn("flex gap-3", entry.role === "user" && "justify-end")}
                >
                  {entry.role === "ai" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      entry.role === "ai"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {entry.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickChip(chip)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5"
                  >
                    {attachment.type === "pdf" ? (
                      <FileText className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span className="max-w-24 truncate text-xs font-medium">
                      {attachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {generationError && (
              <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {generationError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Descreva sua atividade..."
                className="h-10 flex-1 rounded-lg border border-border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ease-out",
                  canSubmit
                    ? "bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setRightPanel("editor")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  rightPanel === "editor"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar atividade
              </button>
              <button
                type="button"
                onClick={() => setRightPanel("preview")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  rightPanel === "preview"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                Pre-visualizar
              </button>
            </div>
          </div>

          {rightPanel === "editor"
            ? currentActivity?.type === "quiz"
              ? renderQuizEditor()
              : renderMissionEditor()
            : renderPreview()}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => saveCurrentActivity("draft")}
          disabled={!currentActivity}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Salvar rascunho
        </button>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowClassDropdown((currentValue) => !currentValue)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-sidebar-accent"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              {selectedClassroom}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showClassDropdown && "rotate-180"
                )}
              />
            </button>
            {showClassDropdown && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowClassDropdown(false)}
                />
                <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-border bg-card p-1 shadow-lg">
                  {classroomOptions.map((classroom) => (
                    <button
                      key={classroom}
                      type="button"
                      onClick={() => handleSelectClassroom(classroom)}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                        selectedClassroom === classroom
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      {classroom}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => saveCurrentActivity("published")}
            disabled={!currentActivity}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Publicar atividade
          </button>
        </div>
      </div>
    </div>
  )
}
