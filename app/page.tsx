"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowLeft,
  ArrowRight,
  Bug,
  Copy,
  CheckCircle2,
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
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { FilterDropdown } from "@/components/filter-dropdown"
import {
  applyActivityOperation,
  type ActivityOperation,
} from "@/lib/activity-operation-schema"
import { cn } from "@/lib/utils"
import {
  activitySchema,
  createEmptyQuizQuestion,
  createEntityId,
  isMissionActivity,
  isQuizActivity,
  relabelAlternatives,
  type Activity,
  type MissionActivity,
  type MissionProofType,
  type MissionValidation,
  type QuizActivity,
  type QuizQuestion,
} from "@/lib/activity-schema"
import { type GenerationDebugPayload } from "@/lib/generation-debug"

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

type UserFacingError = {
  title: string
  description: string
  suggestion?: string
}

type GenerationResponsePayload = {
  operation?: ActivityOperation
  activity?: unknown
  assistantMessage?: string
  error?: string
  model?: string
  debug?: GenerationDebugPayload
}

type StreamingGenerationEvent =
  | {
      type: "phase_update"
      data: {
        phase: "router" | "planner" | "executor" | "reviewer" | "patch" | "clarification"
        model: string | null
        message: string
      }
    }
  | {
      type: "session"
      data: {
        model: string
        fallbackModel: string | null
        apiVersion: string
        includeDebug: boolean
      }
    }
  | {
      type: "attempt_start"
      data: {
        attemptNumber: number
        model: string
        temperature: number
      }
    }
  | {
      type: "preview_delta"
      data: {
        attemptNumber: number
        model: string
        textDelta: string
      }
    }
  | {
      type: "attempt_complete"
      data: {
        attemptNumber: number
        model: string
        success: boolean
        durationMs: number
        totalTokenCount: number | null
        normalizationError: string | null
      }
    }
  | {
      type: "final_result"
      data: {
        operation: ActivityOperation
        activity: unknown
        assistantMessage: string
        model: string
        debug: GenerationDebugPayload | null
      }
    }
  | {
      type: "final_error"
      data: {
        error: string
        details: string | null
        httpStatus: number
        debug: GenerationDebugPayload | null
      }
    }

const welcomeMessage: ChatMessage = {
  id: "welcome-message",
  role: "ai",
  content:
    "Ola! Descreva a atividade que voce quer criar ou envie materiais em PDF/imagem. Eu gero um quiz ou uma missao completos para voce.",
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

function isLocalDebugHost(_hostname: string) {
  // Debug habilitado em todos os ambientes para facilitar depuracao
  return true
}

function formatDebugJson(value: unknown) {
  if (value === null || value === undefined) {
    return "n/a"
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function normalizeUserFacingError(rawMessage: string): UserFacingError {
  const normalizedMessage = rawMessage.trim()

  if (normalizedMessage.includes("Array must contain at most 10 element")) {
    return {
      title: "Quantidade de questoes acima do permitido",
      description:
        "Esse pedido ultrapassou o limite atual de questoes que a interface consegue organizar de uma vez.",
      suggestion:
        "Tente pedir um numero menor de questoes agora ou divida em dois pedidos, por exemplo: 'gere 10 agora' e depois 'adicione mais 10'.",
    }
  }

  if (normalizedMessage.includes("GEMINI_API_KEY") || normalizedMessage.includes("API de IA nao foi configurada")) {
    return {
      title: "Configuração da IA ausente",
      description:
        "A chave da IA não está configurada corretamente neste ambiente.",
      suggestion: "Verifique a configuração da chave da IA e tente novamente.",
    }
  }

  if (normalizedMessage.includes("JSON invalido")) {
    return {
      title: "Resposta da IA veio em formato inesperado",
      description:
        "A resposta recebida não pôde ser interpretada com segurança.",
      suggestion: "Tente novamente com um pedido mais específico.",
    }
  }

  if (normalizedMessage.includes("nao e suportado. Use apenas PDF ou imagem")) {
    return {
      title: "Formato de arquivo não suportado",
      description:
        "No momento, a interface aceita apenas imagens e arquivos PDF como anexo.",
      suggestion: "Envie um PDF ou uma imagem e tente novamente.",
    }
  }

  if (normalizedMessage.includes("excede o limite de 8 MB")) {
    return {
      title: "Arquivo muito grande",
      description:
        "Um dos anexos ultrapassou o tamanho máximo permitido.",
      suggestion: "Reduza o arquivo para menos de 8 MB e tente novamente.",
    }
  }

  if (normalizedMessage.includes("Descreva a atividade ou envie ao menos um anexo")) {
    return {
      title: "Faltou contexto para gerar a atividade",
      description:
        "Nenhum texto nem anexo foi enviado para a IA trabalhar.",
      suggestion: "Descreva a atividade desejada ou envie um material de apoio.",
    }
  }

  if (normalizedMessage.includes("nao conseguiu produzir uma operacao aprovada")) {
    return {
      title: "A IA não conseguiu concluir esse pedido",
      description:
        "O sistema tentou refinar a resposta, mas não chegou a uma operação segura para aplicar.",
      suggestion: "Reformule o pedido com mais clareza e tente novamente.",
    }
  }

  return {
    title: "Nao foi possivel concluir sua solicitacao",
    description:
      "Aconteceu um problema durante a geracao ou edicao da atividade.",
    suggestion: "Tente novamente em instantes ou reformule o pedido.",
  }
}

function getModelDisplayName(
  rawModel: string | null | undefined,
  debugPayload: GenerationDebugPayload | null
) {
  if (!rawModel) {
    return "n/a"
  }

  if (rawModel === debugPayload?.fallbackModel) {
    return "modelo de reserva"
  }

  if (rawModel === debugPayload?.model || rawModel === debugPayload?.finalModel) {
    return "modelo principal"
  }

  return "modelo de IA"
}

function sanitizeProviderText(value: string) {
  return value
    .replace(/gemini-3\.1-pro-preview/gi, "modelo principal")
    .replace(/gemini-2\.5-flash/gi, "modelo de reserva")
    .replace(/gemini/gi, "modelo de IA")
}

function sanitizeDebugValue(value: unknown, debugPayload: GenerationDebugPayload | null): unknown {
  if (typeof value === "string") {
    return sanitizeProviderText(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDebugValue(item, debugPayload))
  }

  if (value && typeof value === "object") {
    const sanitizedEntries = Object.entries(value).map(([key, entryValue]) => {
      if (key === "model" || key === "finalModel" || key === "fallbackModel" || key === "modelVersion") {
        return [key, getModelDisplayName(String(entryValue ?? ""), debugPayload)]
      }

      return [key, sanitizeDebugValue(entryValue, debugPayload)]
    })

    return Object.fromEntries(sanitizedEntries)
  }

  return value
}

function formatDebugReport(debugPayload: GenerationDebugPayload | null) {
  if (!debugPayload) {
    return "Ainda nao ha logs. Gere uma atividade para popular este painel."
  }

  const sanitizedPayload = sanitizeDebugValue(debugPayload, debugPayload) as GenerationDebugPayload

  return [
    "=== DEBUG IA ===",
    "",
    `Modelo configurado: ${sanitizedPayload.model}`,
    `Modelo final: ${sanitizedPayload.finalModel ?? "n/a"}`,
    `Fallback: ${sanitizedPayload.fallbackModel ?? "n/a"}`,
    `API version: ${sanitizedPayload.apiVersion}`,
    `Host: ${sanitizedPayload.requestHost ?? "n/a"}`,
    `Inicio: ${sanitizedPayload.startedAt}`,
    `Conclusao: ${sanitizedPayload.completedAt ?? "n/a"}`,
    `Duracao total: ${sanitizedPayload.totalDurationMs ?? "n/a"} ms`,
    `Erro final: ${sanitizedPayload.finalError ?? "Nenhum"}`,
    "",
    "=== ANEXOS ===",
    formatDebugJson(sanitizedPayload.attachmentSummary),
    "",
    "=== PROMPT BASE ===",
    sanitizedPayload.basePrompt || "n/a",
    "",
    "=== SYSTEM INSTRUCTION ===",
    sanitizedPayload.systemInstruction || "n/a",
    "",
    "=== WORKFLOW STAGES ===",
    formatDebugJson(sanitizedPayload.workflowStages),
    "",
    "=== ATTEMPTS ===",
    formatDebugJson(sanitizedPayload.attempts),
    "",
    "=== FINAL OPERATION ===",
    formatDebugJson(sanitizedPayload.finalOperation),
    "",
    "=== FINAL NORMALIZED PAYLOAD ===",
    formatDebugJson(sanitizedPayload.finalNormalizedPayload),
    "",
    "=== FINAL ACTIVITY ===",
    formatDebugJson(sanitizedPayload.finalActivity),
  ].join("\n")
}

function getLatestTokenCount(debugPayload: GenerationDebugPayload | null) {
  const latestAttempt = debugPayload?.attempts[debugPayload.attempts.length - 1]

  return (
    latestAttempt?.usageMetadata?.totalTokenCount ??
    latestAttempt?.usageMetadata?.candidatesTokenCount ??
    latestAttempt?.candidates.reduce(
      (total, candidate) => total + (candidate.tokenCount ?? 0),
      0
    ) ??
    null
  )
}

async function readStreamingEvents(
  response: Response,
  onEvent: (event: StreamingGenerationEvent) => void
) {
  if (!response.body) {
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  const flushBuffer = () => {
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine) {
        continue
      }

      onEvent(JSON.parse(trimmedLine) as StreamingGenerationEvent)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    flushBuffer()

    if (done) {
      break
    }
  }

  const finalLine = buffer.trim()

  if (finalLine) {
    onEvent(JSON.parse(finalLine) as StreamingGenerationEvent)
  }
}

export default function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("initial")
  const [rightPanel, setRightPanel] = useState<RightPanelView>("editor")
  const [quizTab, setQuizTab] = useState<QuizTab>("questoes")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])
  const [generationState, setGenerationState] = useState<GenerationState>("idle")
  const [generationError, setGenerationError] = useState<UserFacingError | null>(null)
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [currentModel, setCurrentModel] = useState<string | null>(null)
  const [isLocalDebugMode, setIsLocalDebugMode] = useState(true)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [latestGenerationDebug, setLatestGenerationDebug] = useState<GenerationDebugPayload | null>(
    null
  )
  const [streamingPreviewText, setStreamingPreviewText] = useState("")
  const [streamingPreviewAttempt, setStreamingPreviewAttempt] = useState<number | null>(null)
  const [streamingPreviewModel, setStreamingPreviewModel] = useState<string | null>(null)
  const [streamingPhase, setStreamingPhase] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const currentQuiz = isQuizActivity(currentActivity) ? currentActivity : null
  const currentMission = isMissionActivity(currentActivity) ? currentActivity : null
  const canSubmit =
    generationState !== "loading" &&
    (message.trim().length > 0 || attachments.length > 0)

  const initialConversationMessages = useMemo(
    () => messages.filter((entry) => entry.id !== welcomeMessage.id).slice(-2),
    [messages]
  )
  const latestClarificationVisible =
    generationState !== "loading" &&
    !currentActivity &&
    initialConversationMessages.length > 0 &&
    initialConversationMessages[initialConversationMessages.length - 1]?.role === "ai"

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    setIsLocalDebugMode(isLocalDebugHost(window.location.hostname))
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
    setMessage("")
    setAttachments([])
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
        content: "Gerando atividade com a IA...",
      },
    ])
  setGenerationState("loading")
  setGenerationError(null)
  setLatestGenerationDebug(null)
  setStreamingPreviewText("")
  setStreamingPreviewAttempt(null)
  setStreamingPreviewModel(null)
  setStreamingPhase(null)

    try {
      const formData = new FormData()
      formData.append("prompt", prompt)
      formData.append(
        "recentMessages",
        JSON.stringify(messages.slice(-6).map((entry) => ({
          role: entry.role,
          content: entry.content,
        })))
      )

      if (currentActivity) {
        formData.append("currentActivity", JSON.stringify(currentActivity))
      }

      attachments.forEach((attachment) => {
        formData.append("attachments", attachment.file, attachment.name)
      })

      const response = await fetch("/api/generate-activity", {
        method: "POST",
        headers: {
          "x-gamefik-stream-preview": "1",
        },
        body: formData,
      })

      let finalPayload: GenerationResponsePayload | null = null
      let streamedError: { error: string; details?: string | null; debug?: GenerationDebugPayload | null } | null =
        null

      await readStreamingEvents(response, (streamEvent) => {
        switch (streamEvent.type) {
          case "phase_update":
            setStreamingPhase(streamEvent.data.phase)
            setStreamingPreviewText((previousText) =>
              `${previousText}${
                previousText.length > 0 ? "\n\n" : ""
              }[${streamEvent.data.phase}] ${streamEvent.data.message}\n`
            )
            break
          case "session":
            setCurrentModel(streamEvent.data.model)
            break
          case "attempt_start":
            setStreamingPreviewAttempt(streamEvent.data.attemptNumber)
            setStreamingPreviewModel(streamEvent.data.model)
            setStreamingPreviewText((previousText) =>
              previousText.length > 0
                ? `${previousText}\n\n---- Tentativa ${streamEvent.data.attemptNumber} · ${getModelDisplayName(streamEvent.data.model, latestGenerationDebug)} ----\n`
                : `---- Tentativa ${streamEvent.data.attemptNumber} · ${getModelDisplayName(streamEvent.data.model, latestGenerationDebug)} ----\n`
            )
            break
          case "preview_delta":
            setStreamingPreviewAttempt(streamEvent.data.attemptNumber)
            setStreamingPreviewModel(streamEvent.data.model)
            setStreamingPreviewText((previousText) => previousText + streamEvent.data.textDelta)
            break
          case "final_result":
            finalPayload = {
              operation: streamEvent.data.operation,
              activity: streamEvent.data.activity,
              assistantMessage: streamEvent.data.assistantMessage,
              model: streamEvent.data.model,
              debug: streamEvent.data.debug ?? undefined,
            }
            break
          case "final_error":
            streamedError = {
              error: streamEvent.data.error,
              details: streamEvent.data.details,
              debug: streamEvent.data.debug,
            }
            break
          default:
            break
        }
      })

      const resolvedPayload = finalPayload as GenerationResponsePayload | null
      const resolvedStreamedError = streamedError as {
        error: string
        details?: string | null
        debug?: GenerationDebugPayload | null
      } | null

      if (resolvedPayload?.debug) {
        setLatestGenerationDebug(resolvedPayload.debug)
      }

      if (resolvedPayload?.model || resolvedPayload?.debug?.model) {
        setCurrentModel(
          resolvedPayload?.model ??
            resolvedPayload?.debug?.finalModel ??
            resolvedPayload?.debug?.model ??
            null
        )
      }

      if (resolvedStreamedError) {
        if (resolvedStreamedError.debug) {
          setLatestGenerationDebug(resolvedStreamedError.debug)
        }
        if (resolvedStreamedError.debug && isLocalDebugMode) {
          setShowDebugPanel(true)
        }
        throw new Error(resolvedStreamedError.error)
      }

      if (!resolvedPayload) {
        throw new Error("Nao foi possivel concluir a geracao em streaming.")
      }

  if (resolvedPayload.operation?.action === "ask_clarification") {
  setGenerationState("idle")
  setStreamingPreviewText("")
  setStreamingPreviewAttempt(null)
  setStreamingPreviewModel(null)
  setStreamingPhase(null)
        replaceAssistantMessage(
          pendingMessageId,
          resolvedPayload.assistantMessage ?? "Preciso de mais detalhes para continuar."
        )
        if (resolvedPayload.debug && isLocalDebugMode) {
          setShowDebugPanel(true)
        }
        return
      }

      const generatedActivity =
        currentActivity && resolvedPayload.operation
          ? activitySchema.parse(applyActivityOperation(currentActivity, resolvedPayload.operation))
          : activitySchema.parse(resolvedPayload.activity)

      setCurrentActivity(generatedActivity)
      setCurrentQuestion(0)
      setQuizTab(generatedActivity.type === "quiz" ? "questoes" : "informacoes")
  setViewMode("creating")
  setRightPanel("editor")
  setGenerationState("idle")
  setStreamingPreviewText("")
  setStreamingPreviewAttempt(null)
  setStreamingPreviewModel(null)
  setStreamingPhase(null)
      replaceAssistantMessage(
        pendingMessageId,
        resolvedPayload.assistantMessage ?? generatedActivity.teacherMessage
      )
      toast.success("Atividade gerada com sucesso.")
      if (resolvedPayload.debug && isLocalDebugMode) {
        setShowDebugPanel(true)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar a atividade no momento."
      const normalizedError = normalizeUserFacingError(errorMessage)

      setGenerationState("error")
      setGenerationError(normalizedError)
      setStreamingPreviewAttempt(null)
      setStreamingPreviewModel(null)
      replaceAssistantMessage(
        pendingMessageId,
        `${normalizedError.title}. ${normalizedError.description}${
          normalizedError.suggestion ? ` ${normalizedError.suggestion}` : ""
        }`
      )
      toast.error(normalizedError.title)
    } finally {
      setMessage("")
      setAttachments([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
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

  const saveCurrentActivity = () => {
    if (!currentActivity) {
      toast.error("Gere ou carregue uma atividade antes de salvar.")
      return
    }

    try {
      activitySchema.parse(currentActivity)
      toast.success("Rascunho salvo com sucesso.")
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? "Preencha todos os campos obrigatorios antes de salvar."
          : "Nao foi possivel salvar a atividade."

      toast.error(errorMessage)
    }
  }

  const getPhaseLabel = (phase: string | null) => {
    switch (phase) {
      case "router":
        return "Analisando intencao..."
      case "planner":
        return "Planejando operacao..."
      case "executor":
        return "Gerando conteudo..."
      case "reviewer":
        return "Revisando qualidade..."
      case "patch":
        return "Aplicando alteracoes..."
      case "clarification":
        return "Preparando pergunta..."
      default:
        return "Iniciando..."
    }
  }

  const renderStreamingPreviewCard = () => {
    if (generationState !== "loading" && !streamingPreviewText) {
      return null
    }

    const isGeneratingContent = streamingPhase === "executor" && streamingPreviewText.includes("----")

    return (
      <div className="animate-fade-in-up rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-card backdrop-blur-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5 animate-spin-smooth" />
            Preview ao vivo
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-dots-1" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-dots-2" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-dots-3" />
          </span>
          {streamingPhase && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700 animate-pulse">
              {getPhaseLabel(streamingPhase)}
            </span>
          )}
          {streamingPreviewAttempt ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Tentativa {streamingPreviewAttempt}
            </span>
          ) : null}
          {streamingPreviewModel ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {getModelDisplayName(streamingPreviewModel, latestGenerationDebug)}
            </span>
          ) : null}
        </div>
        {!isGeneratingContent && streamingPhase && streamingPhase !== "executor" && (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {streamingPhase === "router" && "A IA esta analisando seu pedido para entender a melhor forma de atende-lo..."}
              {streamingPhase === "planner" && "Definindo a estrategia para criar ou modificar sua atividade..."}
              {streamingPhase === "reviewer" && "Verificando se o conteudo gerado atende ao seu pedido..."}
              {streamingPhase === "patch" && "Aplicando as alteracoes na atividade..."}
              {streamingPhase === "clarification" && "Preparando uma pergunta para esclarecer seu pedido..."}
            </span>
          </div>
        )}
        <pre className="max-h-72 overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
          {streamingPreviewText || "Conectando com a IA..."}
        </pre>
      </div>
    )
  }

  const renderClarificationCard = () => {
    if (!latestClarificationVisible) {
      return null
    }

    return (
      <div className="animate-fade-in-up rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-card backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Preciso de mais contexto
          </span>
        </div>
        <div className="space-y-3">
          {initialConversationMessages.map((entry, index) => (
            <div
              key={entry.id}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed animate-fade-in-up opacity-0",
                entry.role === "ai"
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {entry.content}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
          Responda no campo acima e eu continuo exatamente daqui.
        </p>
      </div>
    )
  }

  const renderDebugControls = () => {
    if (!isLocalDebugMode) {
      return null
    }

    const latestAttempt =
      latestGenerationDebug?.attempts[latestGenerationDebug.attempts.length - 1] ?? null
    const latestTokenCount = getLatestTokenCount(latestGenerationDebug)
    const handleCopyAllDebug = async () => {
      try {
        await navigator.clipboard.writeText(formatDebugReport(latestGenerationDebug))
        toast.success("Debug completo copiado para a area de transferencia.")
      } catch {
        toast.error("Nao foi possivel copiar o debug completo.")
      }
    }

    return (
      <>
        <button
          type="button"
          onClick={() => setShowDebugPanel(true)}
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-full border border-primary/30 bg-card/95 px-4 py-2 text-sm font-semibold text-foreground shadow-xl backdrop-blur-sm transition-colors hover:bg-card"
        >
          <Bug className="h-4 w-4 text-primary" />
            Debug IA
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              ativo
            </span>
          {latestTokenCount ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {latestTokenCount} tokens
            </span>
          ) : null}
        </button>

        {showDebugPanel && (
          <>
            <button
              type="button"
              aria-label="Fechar debug"
              onClick={() => setShowDebugPanel(false)}
              className="fixed inset-0 z-[69] bg-black/45 backdrop-blur-[1px]"
            />
            <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-3xl flex-col border-l border-border bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">
                      Debug completo da geracao
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Painel de debug ativo. Aqui voce ve prompt, retries, resposta bruta, payload normalizado e telemetria.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAllDebug}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDebugPanel(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 md:grid-cols-4">
                <div className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Modelo
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {latestGenerationDebug?.finalModel ??
                      currentModel ??
                      latestGenerationDebug?.model ??
                      "n/a"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    API
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {latestGenerationDebug?.apiVersion ?? "n/a"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Duracao
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {latestGenerationDebug?.totalDurationMs
                      ? `${latestGenerationDebug.totalDurationMs} ms`
                      : "n/a"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Tokens
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {latestTokenCount ?? "n/a"}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-auto px-5 py-5">
                {!latestGenerationDebug ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
                    Ainda nao ha logs. Gere uma atividade para popular este painel.
                  </div>
                ) : (
                  <>
                    <section className="rounded-2xl border border-border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        Resumo da execucao
                      </h3>
                      <dl className="grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Host da requisicao
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {latestGenerationDebug.requestHost ?? "n/a"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Tentativas
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {latestGenerationDebug.attempts.length}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Inicio
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {latestGenerationDebug.startedAt}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Conclusao
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {latestGenerationDebug.completedAt ?? "n/a"}
                          </dd>
                        </div>
                        <div className="md:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Modelo configurado / fallback
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {latestGenerationDebug.model}
                            {latestGenerationDebug.fallbackModel
                              ? ` → fallback: ${latestGenerationDebug.fallbackModel}`
                              : ""}
                          </dd>
                        </div>
                        <div className="md:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Erro final
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {latestGenerationDebug.finalError ?? "Nenhum"}
                          </dd>
                        </div>
                        <div className="md:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Anexos considerados
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {latestGenerationDebug.attachmentSummary.length > 0
                              ? latestGenerationDebug.attachmentSummary
                                  .map(
                                    (attachment) =>
                                      `${attachment.name} (${attachment.mimeType}, ${formatFileSize(
                                        attachment.size
                                      )})`
                                  )
                                  .join(" • ")
                              : "Nenhum anexo"}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        Prompt-base e instrucao de sistema
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                            Prompt-base
                          </p>
                          <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                            {latestGenerationDebug.basePrompt}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                            System instruction
                          </p>
                          <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                            {latestGenerationDebug.systemInstruction}
                          </pre>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        Resultado final normalizado
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                            Payload normalizado
                          </p>
                          <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                            {formatDebugJson(latestGenerationDebug.finalNormalizedPayload)}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                            Atividade final enviada para a UI
                          </p>
                          <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                            {formatDebugJson(latestGenerationDebug.finalActivity)}
                          </pre>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        Workflow de decisao da IA
                      </h3>
                      {latestGenerationDebug.workflowStages.length === 0 ? (
                        <div className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
                          Nenhuma etapa estruturada registrada.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {latestGenerationDebug.workflowStages.map((stage) => (
                            <details
                              key={`${stage.stage}-${stage.index}`}
                              className="overflow-hidden rounded-xl border border-border bg-background"
                              open={stage.index === latestGenerationDebug.workflowStages.length}
                            >
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
                                <span>
                                  {stage.index}. {stage.stage} · {stage.model}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                  {stage.durationMs} ms · {stage.success ? "ok" : "falhou"}
                                </span>
                              </summary>
                              <div className="space-y-3 border-t border-border px-4 py-4">
                                <div>
                                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                    Prompt
                                  </p>
                                  <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                    {stage.promptText}
                                  </pre>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                    Resposta bruta
                                  </p>
                                  <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                    {stage.responseText ?? "n/a"}
                                  </pre>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                    JSON parseado
                                  </p>
                                  <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                    {formatDebugJson(stage.parsedJson)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                    Usage metadata
                                  </p>
                                  <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                    {formatDebugJson(stage.usageMetadata)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                    Erro
                                  </p>
                                  <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                    {stage.error ?? "Nenhum"}
                                  </pre>
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        Tentativas
                      </h3>
                      <div className="space-y-3">
                        {latestGenerationDebug.attempts.map((attempt) => (
                          <details
                            key={attempt.attemptNumber}
                            className="overflow-hidden rounded-xl border border-border bg-background"
                            open={attempt.attemptNumber === latestGenerationDebug.attempts.length}
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
                              <span>
                                Tentativa {attempt.attemptNumber} · {attempt.requestConfig.model}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">
                                {attempt.durationMs} ms ·{" "}
                                {attempt.usageMetadata?.totalTokenCount ??
                                  attempt.usageMetadata?.candidatesTokenCount ??
                                  "n/a"}{" "}
                                tokens
                              </span>
                            </summary>
                            <div className="space-y-4 border-t border-border px-4 py-4">
                              <div className="grid gap-3 text-sm md:grid-cols-2">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Inicio
                                  </p>
                                  <p className="mt-1 text-foreground">{attempt.startedAt}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Sucesso
                                  </p>
                                  <p className="mt-1 text-foreground">
                                    {attempt.success ? "Sim" : "Nao"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Response ID
                                  </p>
                                  <p className="mt-1 break-all text-foreground">
                                    {attempt.responseId ?? "n/a"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Model version
                                  </p>
                                  <p className="mt-1 break-all text-foreground">
                                    {attempt.modelVersion ?? "n/a"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Configuracao da requisicao
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {formatDebugJson(attempt.requestConfig)}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Prompt final usado nesta tentativa
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {attempt.promptText}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Usage metadata / tokens
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {formatDebugJson(attempt.usageMetadata)}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Prompt feedback
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {formatDebugJson(attempt.promptFeedback)}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Candidates
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {formatDebugJson(attempt.candidates)}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Resultado bruto do prompt
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {attempt.responseText ?? "n/a"}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  JSON parseado
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {formatDebugJson(attempt.parsedResponseJson)}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Payload normalizado desta tentativa
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {formatDebugJson(attempt.normalizedPayload)}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Chunks do stream
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {formatDebugJson(attempt.streamChunks)}
                                </pre>
                              </div>

                              <div>
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Erro de normalizacao / validacao
                                </p>
                                <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                                  {attempt.normalizationError ?? "Nenhum"}
                                </pre>
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    </section>

                    {latestAttempt && (
                      <section className="rounded-2xl border border-border bg-card p-4">
                        <h3 className="mb-3 text-sm font-semibold text-foreground">
                          Ultima tentativa em foco
                        </h3>
                        <pre className="overflow-auto rounded-xl bg-muted px-3 py-3 text-xs text-foreground whitespace-pre-wrap break-words">
                          {formatDebugJson(latestAttempt)}
                        </pre>
                      </section>
                    )}
                  </>
                )}
              </div>
            </aside>
          </>
        )}
      </>
    )
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
          Gamefik IA
        </div>

        <h1 className="chat-hero-animate chat-hero-delay-1 font-heading mb-3 max-w-[20ch] text-center text-3xl font-bold leading-tight tracking-tight text-foreground drop-shadow-[0_2px_24px_rgba(0,0,0,0.12)] md:max-w-none md:text-4xl">
          O que vamos{" "}
          <span className="bg-gradient-to-r from-primary via-[oklch(0.55_0.18_280)] to-primary bg-clip-text text-transparent">
            criar hoje?
          </span>
        </h1>

        <p className="chat-hero-animate chat-hero-delay-2 mb-7 max-w-xl text-center text-sm font-medium leading-relaxed text-muted-foreground drop-shadow-sm md:text-[0.9375rem]">
          Descreva um tema, cole um texto ou anexe material. A IA gera um quiz ou uma missao prontos para editar e salvar.
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
                  {attachments.map((attachment, index) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-1.5 animate-pop-in opacity-0"
                      style={{ animationDelay: `${index * 0.05}s` }}
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
                        className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground hover:scale-125 active:scale-90"
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
                className="w-full resize-none rounded-t-[14px] bg-transparent px-5 py-4 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground transition-all duration-200 focus:bg-muted/30"
              />

              {generationError && (
                <div className="mx-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4 animate-fade-in-up">
                  <div className="mb-1 text-sm font-semibold text-destructive">
                    {generationError.title}
                  </div>
                  <p className="text-sm text-destructive/90">
                    {generationError.description}
                  </p>
                  {generationError.suggestion && (
                    <p className="mt-2 text-xs font-medium text-destructive/80">
                      {generationError.suggestion}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-border/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground hover:scale-105 active:scale-95"
                  >
                    <Paperclip className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" aria-hidden />
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
                    {currentModel
                      ? `Modelo ativo: ${getModelDisplayName(currentModel, latestGenerationDebug)}`
                      : "IA conectada"}
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
                  <Sparkles className={cn("relative h-4 w-4", generationState === "loading" && "animate-spin-smooth")} />
                  <span>{generationState === "loading" ? "Gerando..." : "Criar com IA"}</span>
                  {generationState === "loading" && (
                    <span className="ml-1 flex items-center gap-0.5">
                      <span className="h-1 w-1 rounded-full bg-white/80 animate-dots-1" />
                      <span className="h-1 w-1 rounded-full bg-white/80 animate-dots-2" />
                      <span className="h-1 w-1 rounded-full bg-white/80 animate-dots-3" />
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {(generationState === "loading" || streamingPreviewText) && (
          <div className="chat-hero-animate chat-hero-delay-4 mt-6 w-full">
            {renderStreamingPreviewCard()}
          </div>
        )}

        {renderClarificationCard() && (
          <div className="chat-hero-animate chat-hero-delay-4 mt-6 w-full">
            {renderClarificationCard()}
          </div>
        )}

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
          <div key="informacoes" className="flex-1 overflow-auto px-6 py-6 animate-fade-in">
            <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Titulo
              </label>
              <input
                type="text"
                value={currentQuiz.title}
                onChange={(event) => updateQuizTextField("title", event.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:scale-[1.01]"
              />
            </div>

            <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descricao
              </label>
              <textarea
                value={currentQuiz.description}
                onChange={(event) => updateQuizTextField("description", event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:scale-[1.01]"
              />
            </div>

            <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.15s" }}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mensagem do professor
              </label>
              <textarea
                value={currentQuiz.teacherMessage}
                onChange={(event) => updateQuizTextField("teacherMessage", event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:scale-[1.01]"
              />
            </div>

            <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contexto dos anexos
              </label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card px-4 py-4">
                {currentQuiz.attachmentContext.length > 0 ? (
                  currentQuiz.attachmentContext.map((contextItem, index) => (
                    <span
                      key={contextItem}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary animate-scale-in opacity-0"
                      style={{ animationDelay: `${index * 0.05}s` }}
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
          <div key="questoes" className="flex-1 overflow-auto animate-fade-in">
            <div className="flex items-center gap-2 border-b border-border px-6 py-3">
              <div className="flex items-center gap-1.5">
                {currentQuiz.quizQuestions.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentQuestion(index)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all duration-300 animate-scale-in opacity-0",
                      index === currentQuestion
                        ? "bg-primary text-primary-foreground scale-105"
                        : "border border-border bg-card text-foreground hover:bg-sidebar-accent hover:scale-105"
                    )}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    Q{index + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all duration-300 hover:bg-sidebar-accent hover:text-foreground hover:scale-110 active:scale-95"
                title="Adicionar questao"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div key={currentQuestion} className="px-6 py-4 animate-slide-in-right">
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(currentQuestion)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-destructive transition-all duration-200 hover:bg-destructive/10 hover:scale-110 active:scale-95"
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
                        "flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-300",
                        "animate-fade-in-up opacity-0",
                        alternative.correct
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-border bg-card"
                      )}
                      style={{ animationDelay: `${alternativeIndex * 0.05}s` }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCorrectAnswer(currentQuestion, alternativeIndex)}
                        className="shrink-0 transition-transform duration-200 hover:scale-110 active:scale-90"
                      >
                        {alternative.correct ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-pop-in" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground transition-all duration-200 hover:text-foreground hover:scale-110" />
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
                        className="shrink-0 text-muted-foreground transition-all duration-200 hover:text-destructive hover:scale-125 active:scale-90"
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
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:translate-x-1 active:scale-95"
                >
                  <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
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
      <div className="flex flex-1 flex-col overflow-hidden animate-fade-in">
        <div className="flex items-center gap-6 border-b border-border px-6 pt-1">
          <button type="button" className="border-b-2 border-primary pb-3 pt-2 text-sm font-medium text-primary">
            Detalhes
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Titulo
            </label>
            <input
              type="text"
              value={currentMission.title}
              onChange={(event) => updateMissionField("title", event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:scale-[1.01]"
            />
          </div>

          <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descricao
            </label>
            <textarea
              value={currentMission.description}
              onChange={(event) => updateMissionField("description", event.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:scale-[1.01]"
            />
          </div>

          <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.15s" }}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mensagem do professor
            </label>
            <textarea
              value={currentMission.teacherMessage}
              onChange={(event) => updateMissionField("teacherMessage", event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:scale-[1.01]"
            />
          </div>

          <div className="mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contexto dos anexos
            </label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card px-4 py-4">
              {currentMission.attachmentContext.length > 0 ? (
                currentMission.attachmentContext.map((contextItem, index) => (
                  <span
                    key={contextItem}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary animate-scale-in opacity-0"
                    style={{ animationDelay: `${0.25 + index * 0.05}s` }}
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
          <div className="max-w-sm rounded-2xl border border-dashed border-border bg-card px-6 py-8 text-center animate-fade-in-up">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary animate-pulse" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Gere uma atividade para visualizar
            </h3>
            <p className="text-sm text-muted-foreground">
              Assim que a IA responder, a pre-visualizacao do aluno aparecera aqui.
            </p>
          </div>
        </div>
      )
    }

    const quizQuestionCount = currentQuiz?.quizQuestions.length ?? 0
    const previewQuestion = currentQuiz?.quizQuestions[0] ?? null

    return (
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-6">
        <p className="mb-6 text-center text-sm text-muted-foreground animate-fade-in">
          Visualizacao no app — como o aluno vera
        </p>
        <div className="flex h-full max-h-[720px] w-full items-center justify-center">
          <div className="w-full max-w-[340px] animate-scale-in">
            <div className="flex h-[640px] flex-col overflow-hidden rounded-[3rem] border-[12px] border-gray-900 bg-gray-900 shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between bg-primary px-4 py-2">
                <span className="text-xs font-medium text-white">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="h-2.5 w-5 rounded-sm border border-white/50 bg-white/20" />
                  <div className="h-2.5 w-2.5 rounded-full border border-white/50 bg-white/20" />
                </div>
                <div className="text-xs font-medium text-white">AAA</div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-white">
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

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
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
                      {currentActivity.attachmentContext.map((contextItem, index) => (
                        <span
                          key={contextItem}
                          className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-700 animate-scale-in opacity-0"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {contextItem}
                        </span>
                      ))}
                    </div>
                  )}

                  {currentActivity.type === "quiz" && previewQuestion ? (
                    <div className="mb-5 rounded-xl bg-slate-50 p-3 animate-fade-in-up">
                      <p className="mb-2 text-xs font-semibold text-slate-900">
                        Questao 1
                      </p>
                      <p className="mb-3 text-sm text-slate-700">{previewQuestion.enunciado}</p>
                      <div className="space-y-2">
                        {previewQuestion.alternatives.map((alternative, index) => (
                          <div
                            key={alternative.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 animate-fade-in-up opacity-0 transition-all duration-200 hover:border-primary/30 hover:bg-slate-50"
                            style={{ animationDelay: `${index * 0.08}s` }}
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

                  <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
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
      </div>
    )
  }

  if (viewMode === "initial") {
    return (
      <>
        {renderInitialView()}
        {renderDebugControls()}
      </>
    )
  }

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1">
          <div className="flex w-[390px] flex-col border-r border-border bg-card">
            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-col gap-4">
                {messages.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn("flex gap-3 animate-fade-in-up opacity-0", entry.role === "user" && "justify-end")}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {entry.role === "ai" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm transition-all duration-200 hover:scale-[1.02]",
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

            <form onSubmit={handleSubmit} className="border-t border-border p-4">
              {renderStreamingPreviewCard() && (
                <div className="mb-3">
                  {renderStreamingPreviewCard()}
                </div>
              )}

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
                <div className="mb-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4">
                  <div className="mb-1 text-sm font-semibold text-destructive">
                    {generationError.title}
                  </div>
                  <p className="text-sm text-destructive/90">
                    {generationError.description}
                  </p>
                  {generationError.suggestion && (
                    <p className="mt-2 text-xs font-medium text-destructive/80">
                      {generationError.suggestion}
                    </p>
                  )}
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
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground hover:-translate-x-0.5 active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
                <button
                  type="button"
                  onClick={() => setRightPanel("editor")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95",
                    rightPanel === "editor"
                      ? "bg-primary text-primary-foreground scale-105"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:scale-105"
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar atividade
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanel("preview")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95",
                    rightPanel === "preview"
                      ? "bg-primary text-primary-foreground scale-105"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:scale-105"
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Pre-visualizar
                </button>
              </div>
            </div>

            <div key={rightPanel} className="animate-fade-in">
              {rightPanel === "editor"
                ? currentActivity?.type === "quiz"
                  ? renderQuizEditor()
                  : renderMissionEditor()
                : renderPreview()}
            </div>
          </div>
        </div>
      </div>
      {renderDebugControls()}
    </>
  )
}
