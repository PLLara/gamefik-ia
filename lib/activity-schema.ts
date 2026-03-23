import { z } from "zod"

export const classroomOptions = [
  "Todas as turmas",
  "6o Ano A",
  "6o Ano B",
  "7o Ano A",
] as const

export const activityStatusSchema = z.enum(["draft", "published"])
export const missionProofTypeSchema = z.enum(["foto", "video", "texto", "arquivo"])
export const missionValidationSchema = z.enum(["ia", "manual", "auto"])

const textField = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} e obrigatorio.`)
    .max(maxLength, `${label} deve ter no maximo ${maxLength} caracteres.`)

const modelQuizAlternativeSchema = z.object({
  text: textField("Texto da alternativa", 240),
  correct: z.boolean(),
})

const modelQuizQuestionSchema = z
  .object({
    enunciado: textField("Enunciado", 600),
    alternatives: z.array(modelQuizAlternativeSchema).min(2).max(6),
    points: z.number().int().min(1).max(100),
  })
  .superRefine((question, ctx) => {
    const correctCount = question.alternatives.filter((alternative) => alternative.correct).length

    if (correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alternatives"],
        message: "Cada questao precisa ter exatamente uma alternativa correta.",
      })
    }
  })

export const quizActivityGenerationSchema = z.object({
  type: z.literal("quiz"),
  title: textField("Titulo", 120),
  description: textField("Descricao", 500),
  teacherMessage: textField("Mensagem do professor", 400),
  attachmentContext: z.array(textField("Contexto do anexo", 120)).max(10).default([]),
  quizQuestions: z.array(modelQuizQuestionSchema).min(1).max(10),
})

export const missionActivityGenerationSchema = z.object({
  type: z.literal("missao"),
  title: textField("Titulo", 120),
  description: textField("Descricao", 800),
  teacherMessage: textField("Mensagem do professor", 400),
  attachmentContext: z.array(textField("Contexto do anexo", 120)).max(10).default([]),
  missionProofType: missionProofTypeSchema,
  missionValidation: missionValidationSchema,
})

export const activityGenerationSchema = z.discriminatedUnion("type", [
  quizActivityGenerationSchema,
  missionActivityGenerationSchema,
])

export const quizAlternativeSchema = z.object({
  id: textField("ID da alternativa", 80),
  label: textField("Rotulo da alternativa", 4),
  text: textField("Texto da alternativa", 240),
  correct: z.boolean(),
})

export const quizQuestionSchema = z
  .object({
    id: textField("ID da questao", 80),
    enunciado: textField("Enunciado", 600),
    alternatives: z.array(quizAlternativeSchema).min(2).max(6),
    points: z.number().int().min(1).max(100),
  })
  .superRefine((question, ctx) => {
    const correctCount = question.alternatives.filter((alternative) => alternative.correct).length

    if (correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alternatives"],
        message: "Cada questao precisa ter exatamente uma alternativa correta.",
      })
    }
  })

export const quizActivitySchema = z.object({
  id: textField("ID da atividade", 80),
  type: z.literal("quiz"),
  title: textField("Titulo", 120),
  description: textField("Descricao", 500),
  teacherMessage: textField("Mensagem do professor", 400),
  attachmentContext: z.array(textField("Contexto do anexo", 120)).max(10),
  quizQuestions: z.array(quizQuestionSchema).min(1).max(10),
})

export const missionActivitySchema = z.object({
  id: textField("ID da atividade", 80),
  type: z.literal("missao"),
  title: textField("Titulo", 120),
  description: textField("Descricao", 800),
  teacherMessage: textField("Mensagem do professor", 400),
  attachmentContext: z.array(textField("Contexto do anexo", 120)).max(10),
  missionProofType: missionProofTypeSchema,
  missionValidation: missionValidationSchema,
})

export const activitySchema = z.discriminatedUnion("type", [
  quizActivitySchema,
  missionActivitySchema,
])

export const storedActivityRecordSchema = z.object({
  activity: activitySchema,
  status: activityStatusSchema,
  classroom: z.string().nullable(),
  createdAt: textField("Data de criacao", 64),
  updatedAt: textField("Data de atualizacao", 64),
  publishedAt: z.string().nullable(),
})

export type ActivityGeneration = z.infer<typeof activityGenerationSchema>
export type Activity = z.infer<typeof activitySchema>
export type QuizActivity = z.infer<typeof quizActivitySchema>
export type MissionActivity = z.infer<typeof missionActivitySchema>
export type QuizQuestion = z.infer<typeof quizQuestionSchema>
export type QuizAlternative = z.infer<typeof quizAlternativeSchema>
export type StoredActivityRecord = z.infer<typeof storedActivityRecordSchema>
export type ActivityStatus = z.infer<typeof activityStatusSchema>
export type MissionProofType = z.infer<typeof missionProofTypeSchema>
export type MissionValidation = z.infer<typeof missionValidationSchema>

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function normalizeToken(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function toInteger(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value)
  }

  if (typeof value === "string") {
    const parsedValue = Number(value)

    if (Number.isFinite(parsedValue)) {
      return Math.round(parsedValue)
    }
  }

  return fallback
}

function normalizeAttachmentContext(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
      .slice(0, 10)
  }

  const singleValue = firstString(value)
  return singleValue ? [singleValue] : []
}

function normalizeActivityType(record: Record<string, unknown>) {
  const candidates = [
    record.type,
    record.activityType,
    record.kind,
    record.activityKind,
  ]

  for (const candidate of candidates) {
    const token = normalizeToken(candidate)

    if (token.includes("quiz")) {
      return "quiz" as const
    }

    if (token.includes("missao") || token.includes("mission") || token.includes("tarefa")) {
      return "missao" as const
    }
  }

  if (Array.isArray(record.quizQuestions) || Array.isArray(record.questions)) {
    return "quiz" as const
  }

  return "missao" as const
}

function normalizeProofType(value: unknown): MissionProofType {
  const token = normalizeToken(value)

  if (token.includes("video")) {
    return "video"
  }

  if (token.includes("foto") || token.includes("imagem")) {
    return "foto"
  }

  if (token.includes("arquivo") || token.includes("pdf") || token.includes("document")) {
    return "arquivo"
  }

  return "texto"
}

function normalizeValidation(value: unknown): MissionValidation {
  const token = normalizeToken(value)

  if (token.includes("manual") || token.includes("professor")) {
    return "manual"
  }

  if (token.includes("auto") || token.includes("self")) {
    return "auto"
  }

  return "ia"
}

function normalizeQuizQuestionPayload(value: unknown) {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const rawAlternatives = Array.isArray(record.alternatives)
    ? record.alternatives
    : Array.isArray(record.options)
      ? record.options
      : Array.isArray(record.answers)
        ? record.answers
        : []

  if (rawAlternatives.length < 2) {
    return null
  }

  const rawCorrectIndex = toInteger(
    record.correctAlternative ??
      record.correctOption ??
      record.correctAlternativeIndex ??
      record.correctAnswerIndex ??
      record.correct,
    -1
  )

  const parseAlternativeString = (value: string) => {
    const trimmedValue = value.trim()

    if (trimmedValue.includes('"text"')) {
      const candidateJson = trimmedValue.startsWith("{")
        ? trimmedValue
        : `{${trimmedValue}}`

      try {
        const parsedValue = JSON.parse(candidateJson)
        const parsedRecord = asRecord(parsedValue)

        if (parsedRecord) {
          return {
            text: firstString(parsedRecord.text, parsedRecord.label, parsedRecord.option),
            correct:
              typeof parsedRecord.correct === "boolean"
                ? parsedRecord.correct
                : typeof parsedRecord.isCorrect === "boolean"
                  ? parsedRecord.isCorrect
                  : null,
          }
        }
      } catch {
        return {
          text: trimmedValue,
          correct: null,
        }
      }
    }

    return {
      text: trimmedValue,
      correct: null,
    }
  }

  const alternatives = rawAlternatives
    .map((alternative, index) => {
      if (typeof alternative === "string" && alternative.trim().length > 0) {
        const parsedStringAlternative = parseAlternativeString(alternative)

        return {
          text: parsedStringAlternative.text ?? alternative.trim(),
          correct:
            parsedStringAlternative.correct !== null
              ? parsedStringAlternative.correct
              : index === rawCorrectIndex,
        }
      }

      const alternativeRecord = asRecord(alternative)

      if (!alternativeRecord) {
        return null
      }

      const text = firstString(
        alternativeRecord.text,
        alternativeRecord.label,
        alternativeRecord.option,
        alternativeRecord.content
      )

      if (!text) {
        return null
      }

      const explicitCorrect =
        typeof alternativeRecord.correct === "boolean"
          ? alternativeRecord.correct
          : typeof alternativeRecord.isCorrect === "boolean"
            ? alternativeRecord.isCorrect
            : index === rawCorrectIndex

      return {
        text,
        correct: explicitCorrect,
      }
    })
    .filter((alternative): alternative is { text: string; correct: boolean } => alternative !== null)

  const boundedAlternatives = alternatives.slice(0, 6)

  if (boundedAlternatives.length < 2) {
    return null
  }

  const firstCorrectIndex = boundedAlternatives.findIndex((alternative) => alternative.correct)
  const normalizedCorrectIndex =
    rawCorrectIndex >= 0 && rawCorrectIndex < boundedAlternatives.length
      ? rawCorrectIndex
      : rawCorrectIndex > 0 && rawCorrectIndex - 1 < boundedAlternatives.length
        ? rawCorrectIndex - 1
      : firstCorrectIndex >= 0
        ? firstCorrectIndex
        : 0

  const normalizedAlternatives = boundedAlternatives.map((alternative, index) => ({
    text: alternative.text,
    correct: index === normalizedCorrectIndex,
  }))

  const enunciado = firstString(
    record.enunciado,
    record.questionText,
    record.prompt,
    record.statement
  )

  if (!enunciado) {
    return null
  }

  return {
    enunciado,
    alternatives: normalizedAlternatives,
    points: toInteger(record.points ?? record.score ?? record.value, 10),
  }
}

export function normalizeActivityGenerationPayload(rawPayload: unknown): ActivityGeneration {
  const record = asRecord(rawPayload)

  if (!record) {
    throw new Error("A IA nao retornou um objeto JSON valido.")
  }

  const normalizedType = normalizeActivityType(record)

  if (normalizedType === "quiz") {
    const rawQuestions = Array.isArray(record.quizQuestions)
      ? record.quizQuestions
      : Array.isArray(record.questions)
        ? record.questions
        : []

    return activityGenerationSchema.parse({
      type: "quiz",
      title: firstString(record.title, record.name, "Quiz gerado com IA"),
      description: firstString(
        record.description,
        record.summary,
        "Atividade gerada automaticamente com base no pedido do professor."
      ),
      teacherMessage: firstString(
        record.teacherMessage,
        record.teacherNote,
        record.studentMessage,
        "Resolva com calma e faca o seu melhor."
      ),
      attachmentContext: normalizeAttachmentContext(
        record.attachmentContext ?? record.attachmentsUsed ?? record.materialsUsed
      ),
      quizQuestions: rawQuestions
        .map(normalizeQuizQuestionPayload)
        .filter(
          (question): question is z.infer<typeof modelQuizQuestionSchema> => question !== null
        ),
    })
  }

  return activityGenerationSchema.parse({
    type: "missao",
    title: firstString(record.title, record.name, "Missao gerada com IA"),
    description: firstString(
      record.description,
      record.instructions,
      record.task,
      "Conclua a atividade seguindo as orientacoes do professor."
    ),
    teacherMessage: firstString(
      record.teacherMessage,
      record.teacherNote,
      record.studentMessage,
      "Capriche na entrega e envie o comprovante solicitado."
    ),
    attachmentContext: normalizeAttachmentContext(
      record.attachmentContext ?? record.attachmentsUsed ?? record.materialsUsed
    ),
    missionProofType: normalizeProofType(
      record.missionProofType ?? record.proofType ?? record.evidenceType
    ),
    missionValidation: normalizeValidation(
      record.missionValidation ?? record.validation ?? record.reviewMode
    ),
  })
}

function randomFragment() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEntityId(prefix: string) {
  return `${prefix}-${randomFragment()}`
}

export function isQuizActivity(activity: Activity | null | undefined): activity is QuizActivity {
  return activity?.type === "quiz"
}

export function isMissionActivity(activity: Activity | null | undefined): activity is MissionActivity {
  return activity?.type === "missao"
}

export function relabelAlternatives<T extends { id: string; text: string; correct: boolean }>(
  alternatives: T[]
) {
  return alternatives.map((alternative, index) => ({
    ...alternative,
    label: String.fromCharCode(65 + index),
  }))
}

export function createEmptyQuizQuestion(): QuizQuestion {
  const baseAlternatives = relabelAlternatives([
    { id: createEntityId("alternative"), text: "", correct: true },
    { id: createEntityId("alternative"), text: "", correct: false },
    { id: createEntityId("alternative"), text: "", correct: false },
    { id: createEntityId("alternative"), text: "", correct: false },
  ])

  return {
    id: createEntityId("question"),
    enunciado: "",
    alternatives: baseAlternatives,
    points: 10,
  }
}

export function createStoredActivityRecord(
  activity: Activity,
  status: ActivityStatus,
  classroom: string | null,
  existing?: StoredActivityRecord
): StoredActivityRecord {
  const timestamp = new Date().toISOString()

  return {
    activity,
    status,
    classroom,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    publishedAt: status === "published" ? existing?.publishedAt ?? timestamp : existing?.publishedAt ?? null,
  }
}

export function toActivityFromModel(generated: ActivityGeneration): Activity {
  if (generated.type === "quiz") {
    return {
      id: createEntityId("activity"),
      type: "quiz",
      title: generated.title,
      description: generated.description,
      teacherMessage: generated.teacherMessage,
      attachmentContext: generated.attachmentContext,
      quizQuestions: generated.quizQuestions.map((question) => ({
        id: createEntityId("question"),
        enunciado: question.enunciado,
        points: question.points,
        alternatives: relabelAlternatives(
          question.alternatives.map((alternative) => ({
            id: createEntityId("alternative"),
            text: alternative.text,
            correct: alternative.correct,
          }))
        ),
      })),
    }
  }

  return {
    id: createEntityId("activity"),
    type: "missao",
    title: generated.title,
    description: generated.description,
    teacherMessage: generated.teacherMessage,
    attachmentContext: generated.attachmentContext,
    missionProofType: generated.missionProofType,
    missionValidation: generated.missionValidation,
  }
}

export const activityGenerationJsonSchema = {
  type: "object",
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: [
        "type",
        "title",
        "description",
        "teacherMessage",
        "attachmentContext",
        "quizQuestions",
      ],
      properties: {
        type: { type: "string", enum: ["quiz"] },
        title: { type: "string" },
        description: { type: "string" },
        teacherMessage: { type: "string" },
        attachmentContext: {
          type: "array",
          items: { type: "string" },
          maxItems: 10,
        },
        quizQuestions: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["enunciado", "alternatives", "points"],
            properties: {
              enunciado: { type: "string" },
              points: { type: "number" },
              alternatives: {
                type: "array",
                minItems: 2,
                maxItems: 6,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["text", "correct"],
                  properties: {
                    text: { type: "string" },
                    correct: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: [
        "type",
        "title",
        "description",
        "teacherMessage",
        "attachmentContext",
        "missionProofType",
        "missionValidation",
      ],
      properties: {
        type: { type: "string", enum: ["missao"] },
        title: { type: "string" },
        description: { type: "string" },
        teacherMessage: { type: "string" },
        attachmentContext: {
          type: "array",
          items: { type: "string" },
          maxItems: 10,
        },
        missionProofType: {
          type: "string",
          enum: ["foto", "video", "texto", "arquivo"],
        },
        missionValidation: {
          type: "string",
          enum: ["ia", "manual", "auto"],
        },
      },
    },
  ],
}
