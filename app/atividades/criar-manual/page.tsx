"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Gamepad2,
  ClipboardList,
  X,
  FileText,
  ImageIcon,
  ArrowLeft,
  Plus,
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
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FilterDropdown } from "@/components/filter-dropdown"

type ActivityType = "quiz" | "missao"

type QuizQuestion = {
  id: string
  enunciado: string
  alternatives: { label: string; text: string; correct: boolean }[]
  points: number
}

const emptyQuizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    enunciado: "",
    alternatives: [
      { label: "A", text: "", correct: true },
      { label: "B", text: "", correct: false },
      { label: "C", text: "", correct: false },
      { label: "D", text: "", correct: false },
    ],
    points: 10,
  },
]

function CriarManualContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const typeParam = searchParams.get("type")
  const [activityType] = useState<ActivityType>(
    typeParam === "missao" ? "missao" : "quiz"
  )

  // Shared state
  const [showClassDropdown, setShowClassDropdown] = useState(false)

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(emptyQuizQuestions)
  const [quizTab, setQuizTab] = useState<"informacoes" | "questoes">("questoes")
  const [quizTitle, setQuizTitle] = useState("")
  const [quizDesc, setQuizDesc] = useState("")

  // Mission state
  const [missionTitle, setMissionTitle] = useState("")
  const [missionDesc, setMissionDesc] = useState("")
  const [missionProofType, setMissionProofType] = useState("foto")
  const [missionValidation, setMissionValidation] = useState("ia")

  // Quiz helper functions
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
    setQuizQuestions((prev) => [...prev, newQuestion])
    setCurrentQuestion(newIndex)
  }

  const addAlternative = (qIndex: number) => {
    setQuizQuestions((prev) => {
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
    setQuizQuestions((prev) => {
      const copy = [...prev]
      const q = copy[qIndex]
      if (q.alternatives.length <= 2) return prev
      const newAlts = q.alternatives
        .filter((_, i) => i !== altIndex)
        .map((alt, i) => ({ ...alt, label: String.fromCharCode(65 + i) }))
      copy[qIndex] = { ...q, alternatives: newAlts }
      return copy
    })
  }

  const deleteQuestion = (qIndex: number) => {
    if (quizQuestions.length <= 1) return
    setQuizQuestions((prev) => prev.filter((_, i) => i !== qIndex))
    setCurrentQuestion((prev) => Math.min(prev, quizQuestions.length - 2))
  }

  // Computed values for preview
  const previewTitle = activityType === "quiz" ? (quizTitle || "Titulo do Quiz") : (missionTitle || "Titulo da Missao")
  const previewDesc = activityType === "quiz" ? (quizDesc || "Descricao da atividade...") : (missionDesc || "Descricao da missao...")

  // ─── Quiz Editor ───
  const renderQuizEditor = () => {
    const q = quizQuestions[currentQuestion]
    if (!q) return null

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
                      i === currentQuestion
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    Q{i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={addQuestion}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                title="Adicionar questao"
              >
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
                  <button
                    onClick={() => deleteQuestion(currentQuestion)}
                    disabled={quizQuestions.length <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                  >
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
                    <div
                      key={altIndex}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                        alt.correct ? "border-emerald-300 bg-emerald-50" : "border-border bg-card"
                      )}
                    >
                      <button onClick={() => toggleCorrectAnswer(currentQuestion, altIndex)} className="shrink-0">
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
                        placeholder="Digite a alternativa..."
                      />
                      <button
                        onClick={() => removeAlternative(currentQuestion, altIndex)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover alternativa"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addAlternative(currentQuestion)}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar alternativa
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Informacoes tab */
          <div className="flex-1 overflow-auto px-6 py-6">
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titulo</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Ex: Quiz de Fracoes para o 6o Ano"
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descricao</label>
              <textarea
                value={quizDesc}
                onChange={(e) => setQuizDesc(e.target.value)}
                placeholder="Descreva o conteudo e objetivo deste quiz..."
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagem de capa</label>
              <div className="flex h-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-sidebar-accent/50">
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

  // ─── Mission Editor ───
  const renderMissionEditor = () => {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-6 border-b border-border px-6 pt-1">
          <button className="border-b-2 border-primary pb-3 pt-2 text-sm font-medium text-primary">
            Detalhes
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          {/* Cover image */}
          <div className="mb-6">
            <div className="flex h-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-sidebar-accent/50">
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
              placeholder="Ex: Missao: Leitura e Reflexao"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* Description - Rich text editor */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descricao
            </label>
            <div className="overflow-hidden rounded-lg border border-border bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-all">
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

  // ─── Phone Preview ───
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
            {/* Cover image area */}
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
                {previewTitle}
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
                <div className="h-8 w-8 rounded-full bg-primary/20" />
                <div>
                  <p className="text-[10px] text-gray-500">Criado por</p>
                  <p className="text-sm font-medium text-gray-900">Professor Gamefik</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-900">Descricao</p>
                <p className="text-sm text-gray-600">{previewDesc}</p>
              </div>

              <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                <div className="h-6 w-6 shrink-0 rounded-full bg-amber-200" />
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/atividades/lista")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {activityType === "quiz" ? (
              <Gamepad2 className="h-5 w-5 text-primary" />
            ) : (
              <ClipboardList className="h-5 w-5 text-amber-600" />
            )}
            <h1 className="text-base font-semibold text-foreground">
              Novo {activityType === "quiz" ? "Quiz" : "Missao"} (Manual)
            </h1>
          </div>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
          {activityType === "quiz" ? (
            <>
              <Gamepad2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Quiz</span>
            </>
          ) : (
            <>
              <ClipboardList className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-foreground">Missao</span>
            </>
          )}
        </div>

        <p className="hidden text-xs text-muted-foreground md:block">
          Criacao manual · editor + preview
        </p>
      </div>

      {/* Main Content - Two panels */}
      <div className="flex min-h-0 flex-1">
        {/* Left - Editor (~55%) */}
        <div className="flex w-full flex-col border-r border-border md:w-[55%]">
          {activityType === "quiz" ? renderQuizEditor() : renderMissionEditor()}
        </div>

        {/* Right - Live Phone Preview (~45%) */}
        <div className="hidden flex-1 flex-col bg-muted/20 md:flex">
          {/* Preview Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Visualizacao do aluno</span>
            </div>
          </div>

          {renderPhonePreview()}
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between border-t border-border bg-card px-6 py-4">
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent">
          <Save className="h-4 w-4" />
          Salvar rascunho
        </button>

        <div className="flex items-center gap-3">
          {/* Class Selector */}
          <div className="relative">
            <button
              onClick={() => setShowClassDropdown(!showClassDropdown)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              Todas as turmas
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showClassDropdown && "rotate-180")} />
            </button>
            {showClassDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowClassDropdown(false)} />
                <div className="absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent">
                    Todas as turmas
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent">
                    6o Ano A
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent">
                    7o Ano B
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Publish Button - standard primary (not shiny) */}
          <button className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <Send className="h-4 w-4" />
            Publicar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CriarManualPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <CriarManualContent />
    </Suspense>
  )
}
