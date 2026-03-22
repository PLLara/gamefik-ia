import type { Part } from "@google/genai"
import { z } from "zod"
import {
  activityOperationJsonSchema,
  activityOperationSchema,
  applyActivityOperation,
  operationPlannerJsonSchema,
  operationPlannerSchema,
  routerDecisionJsonSchema,
  routerDecisionSchema,
  type ActivityOperation,
  type OperationPlanner,
  type RouterDecision,
} from "@/lib/activity-operation-schema"
import {
  buildExecutorPrompt,
  buildPlannerPrompt,
  buildReviewerPrompt,
  buildRouterPrompt,
  executorSystemInstruction,
  plannerSystemInstruction,
  reviewerJsonSchema,
  reviewerSystemInstruction,
  routerSystemInstruction,
} from "@/lib/activity-operation-prompts"
import { type AttachmentDescriptor } from "@/lib/activity-prompts"
import { activitySchema, type Activity } from "@/lib/activity-schema"
import {
  type DebugGenerationAttempt,
  type DebugStreamChunk,
  type DebugWorkflowStage,
  type GenerationDebugPayload,
} from "@/lib/generation-debug"
import {
  GEMINI_API_VERSION,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL,
  getGeminiClient,
} from "@/lib/gemini"

type RecentMessage = {
  role: "user" | "ai"
  content: string
}

export type OrchestrationEvent =
  | {
      type: "phase_update"
      data: {
        phase:
          | "router"
          | "planner"
          | "executor"
          | "reviewer"
          | "patch"
          | "clarification"
        model: string | null
        message: string
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
      type: "attempt_start"
      data: {
        attemptNumber: number
        model: string
        temperature: number
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

type StructuredStageResult<T> = {
  model: string
  parsed: T
  promptText: string
  responseText: string
  startedAt: string
  durationMs: number
  usageMetadata: unknown
}

type ExecutorResult = {
  model: string
  operation: ActivityOperation
  promptText: string
  responseText: string
  startedAt: string
  durationMs: number
  usageMetadata: unknown
  streamChunks: DebugStreamChunk[]
}

export type OrchestrationResult = {
  operation: ActivityOperation
  activity: Activity | null
  assistantMessage: string
  model: string
  routerDecision: RouterDecision
  planner: OperationPlanner | null
}

type OrchestrationOptions = {
  userPrompt: string
  currentActivity: Activity | null
  attachments: AttachmentDescriptor[]
  attachmentParts: Part[]
  recentMessages: RecentMessage[]
  debugPayload: GenerationDebugPayload | null
  emit?: (event: OrchestrationEvent) => void
}

const candidateModels = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
  (modelName, index, array) => array.indexOf(modelName) === index
)

function toPlainJson<T>(value: T) {
  if (value === undefined) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return null
  }
}

function normalizeRouterDecision(decision: RouterDecision) {
  return routerDecisionSchema.parse({
    action: decision.action,
    reason: decision.reason,
    confidence: decision.confidence ?? "medium",
    needsClarification: decision.needsClarification ?? false,
    clarificationQuestion: decision.clarificationQuestion ?? null,
  })
}

function normalizePlannerDecision(planner: OperationPlanner) {
  return operationPlannerSchema.parse({
    action: planner.action,
    scopeSummary: planner.scopeSummary,
    targetQuestionId: planner.targetQuestionId ?? null,
    targetQuestionIndex: planner.targetQuestionIndex ?? null,
    appendCount: planner.appendCount ?? null,
    fieldsToUpdate: planner.fieldsToUpdate ?? [],
    preserveActivityType: planner.preserveActivityType ?? true,
  })
}

function pushWorkflowStage(
  debugPayload: GenerationDebugPayload | null,
  stage: Omit<DebugWorkflowStage, "index">
) {
  if (!debugPayload) {
    return
  }

  debugPayload.workflowStages.push({
    index: debugPayload.workflowStages.length + 1,
    ...stage,
  })
}

async function callStructuredModel<T>({
  models,
  promptText,
  systemInstruction,
  jsonSchema,
  parser,
}: {
  models: string[]
  promptText: string
  systemInstruction: string
  jsonSchema: unknown
  parser: z.ZodSchema<T>
}) {
  const gemini = await getGeminiClient()
  let lastError: unknown = null

  for (const model of models) {
    const startedAt = new Date()
    const startedAtMs = Date.now()

    try {
      const response = await gemini.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: promptText }],
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          systemInstruction,
        },
      })

      const responseText = response.text?.trim() ?? ""
      const parsed = parser.parse(JSON.parse(responseText))

      return {
        model,
        parsed,
        promptText,
        responseText,
        startedAt: startedAt.toISOString(),
        durationMs: Date.now() - startedAtMs,
        usageMetadata: toPlainJson(response.usageMetadata),
      } satisfies StructuredStageResult<T>
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error("Falha ao obter resposta estruturada do Gemini.")
}

async function callExecutorStream({
  promptText,
  attachmentParts,
  emit,
  attemptNumber,
}: {
  promptText: string
  attachmentParts: Part[]
  emit?: (event: OrchestrationEvent) => void
  attemptNumber: number
}) {
  const gemini = await getGeminiClient()
  let lastError: unknown = null

  for (const model of candidateModels) {
    const startedAt = new Date()
    const startedAtMs = Date.now()
    const streamChunks: DebugStreamChunk[] = []

    emit?.({
      type: "attempt_start",
      data: {
        attemptNumber,
        model,
        temperature: 0.15,
      },
    })

    try {
      const stream = await gemini.models.generateContentStream({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: promptText }, ...attachmentParts],
          },
        ],
        config: {
          temperature: 0.15,
          responseMimeType: "application/json",
          responseJsonSchema: activityOperationJsonSchema,
          systemInstruction: executorSystemInstruction,
        },
      })

      let responseText = ""
      let lastChunk: Awaited<ReturnType<typeof stream.next>>["value"] | null = null
      let chunkIndex = 0

      for await (const chunk of stream) {
        lastChunk = chunk
        const textDelta = chunk.text ?? ""

        if (!textDelta) {
          continue
        }

        responseText += textDelta
        chunkIndex += 1

        const debugChunk: DebugStreamChunk = {
          chunkIndex,
          receivedAt: new Date().toISOString(),
          textDelta,
        }

        streamChunks.push(debugChunk)
        emit?.({
          type: "preview_delta",
          data: {
            attemptNumber,
            model,
            textDelta,
          },
        })
      }

      const operation = activityOperationSchema.parse(JSON.parse(responseText))

      return {
        model,
        operation,
        promptText,
        responseText,
        startedAt: startedAt.toISOString(),
        durationMs: Date.now() - startedAtMs,
        usageMetadata: toPlainJson(lastChunk?.usageMetadata),
        streamChunks,
      } satisfies ExecutorResult
    } catch (error) {
      lastError = error
      emit?.({
        type: "attempt_complete",
        data: {
          attemptNumber,
          model,
          success: false,
          durationMs: Date.now() - startedAtMs,
          totalTokenCount: null,
          normalizationError:
            error instanceof Error
              ? error.message
              : "Falha ao executar a operacao com este modelo.",
        },
      })
    }
  }

  throw lastError ?? new Error("Falha ao executar a operacao com os modelos disponiveis.")
}

function buildAssistantMessage(
  operation: ActivityOperation,
  nextActivity: Activity | null,
  routerDecision: RouterDecision
) {
  if (operation.action === "ask_clarification") {
    return (operation.payload as { question: string }).question
  }

  if (operation.action === "append_questions" && nextActivity?.type === "quiz") {
    return `Adicionei ${operation.payload.questions.length} questoes novas ao quiz sem recriar o restante.`
  }

  if (operation.action === "update_metadata") {
    return "Atualizei os metadados pedidos sem recriar a atividade inteira."
  }

  if (operation.action === "replace_question") {
    return "Atualizei a questao solicitada sem alterar o restante do quiz."
  }

  if (operation.action === "mission_adjustment") {
    return "Ajustei a missao de forma localizada, preservando o restante da atividade."
  }

  if (operation.action === "remove_question") {
    return "Removi a questao solicitada e preservei o restante do quiz."
  }

  if (operation.action === "full_regeneration") {
    return nextActivity?.teacherMessage ?? routerDecision.reason
  }

  return routerDecision.reason
}

export async function orchestrateActivityOperation({
  userPrompt,
  currentActivity,
  attachments,
  attachmentParts,
  recentMessages,
  debugPayload,
  emit,
}: OrchestrationOptions): Promise<OrchestrationResult> {
  emit?.({
    type: "phase_update",
    data: {
      phase: "router",
      model: GEMINI_MODEL,
      message: "Analisando a intencao do pedido...",
    },
  })

  const routerResult = await callStructuredModel({
    models: candidateModels,
    promptText: buildRouterPrompt({
      userPrompt,
      currentActivity,
      attachments,
      recentMessages,
    }),
    systemInstruction: routerSystemInstruction,
    jsonSchema: routerDecisionJsonSchema,
    parser: routerDecisionSchema,
  })
  const normalizedRouterDecision = normalizeRouterDecision(routerResult.parsed as RouterDecision)

  pushWorkflowStage(debugPayload, {
    stage: "router",
    model: routerResult.model,
    startedAt: routerResult.startedAt,
    durationMs: routerResult.durationMs,
    promptText: routerResult.promptText,
    responseText: routerResult.responseText,
    parsedJson: toPlainJson(normalizedRouterDecision),
    usageMetadata: routerResult.usageMetadata ?? null,
    success: true,
    error: null,
  })

  emit?.({
    type: "phase_update",
    data: {
      phase: normalizedRouterDecision.action === "ask_clarification" ? "clarification" : "planner",
      model: routerResult.model,
      message: `Acao escolhida: ${normalizedRouterDecision.action}.`,
    },
  })

  if (
    normalizedRouterDecision.action === "ask_clarification" ||
    normalizedRouterDecision.needsClarification
  ) {
    const clarificationOperation = activityOperationSchema.parse({
      action: "ask_clarification",
      payload: {
        question:
          normalizedRouterDecision.clarificationQuestion ??
          "Pode me explicar melhor o que voce quer alterar nesta atividade?",
      },
    }) as Extract<ActivityOperation, { action: "ask_clarification" }>

    if (debugPayload) {
      debugPayload.finalOperation = toPlainJson(clarificationOperation)
    }

    return {
      operation: clarificationOperation,
      activity: currentActivity,
      assistantMessage: clarificationOperation.payload.question,
      model: routerResult.model,
      routerDecision: normalizedRouterDecision,
      planner: null,
    }
  }

  const plannerResult = await callStructuredModel({
    models: candidateModels,
    promptText: buildPlannerPrompt({
      userPrompt,
      currentActivity,
      attachments,
      recentMessages,
      routerDecision: normalizedRouterDecision,
    }),
    systemInstruction: plannerSystemInstruction,
    jsonSchema: operationPlannerJsonSchema,
    parser: operationPlannerSchema,
  })
  const normalizedPlanner = normalizePlannerDecision(plannerResult.parsed as OperationPlanner)

  pushWorkflowStage(debugPayload, {
    stage: "planner",
    model: plannerResult.model,
    startedAt: plannerResult.startedAt,
    durationMs: plannerResult.durationMs,
    promptText: plannerResult.promptText,
    responseText: plannerResult.responseText,
    parsedJson: toPlainJson(normalizedPlanner),
    usageMetadata: plannerResult.usageMetadata ?? null,
    success: true,
    error: null,
  })

  let feedbackForExecutor = ""
  let executorAttemptNumber = 0

  while (executorAttemptNumber < 4) {
    executorAttemptNumber += 1

    emit?.({
      type: "phase_update",
      data: {
        phase: "executor",
        model: GEMINI_MODEL,
        message:
          executorAttemptNumber === 1
            ? "Executando a operacao pedida..."
            : `Refinando a execucao (${executorAttemptNumber})...`,
      },
    })

    const executorPrompt = `${buildExecutorPrompt({
      userPrompt,
      currentActivity,
      attachments,
      recentMessages,
      routerDecision: normalizedRouterDecision,
      planner: normalizedPlanner,
    })}${feedbackForExecutor ? `\n\nFeedback de revisao para corrigir:\n${feedbackForExecutor}` : ""}`

    const executorResult = await callExecutorStream({
      promptText: executorPrompt,
      attachmentParts,
      emit,
      attemptNumber: executorAttemptNumber,
    })

    const attemptDebug: DebugGenerationAttempt = {
      attemptNumber: executorAttemptNumber,
      startedAt: executorResult.startedAt,
      durationMs: executorResult.durationMs,
      promptText: executorResult.promptText,
      requestConfig: {
        model: executorResult.model,
        apiVersion: GEMINI_API_VERSION,
        temperature: 0.15,
        responseMimeType: "application/json",
      },
      responseText: executorResult.responseText,
      responseId: null,
      modelVersion: executorResult.model,
      usageMetadata: executorResult.usageMetadata ?? null,
      promptFeedback: null,
      candidates: [],
      streamChunks: executorResult.streamChunks,
      parsedResponseJson: toPlainJson(executorResult.operation),
      normalizedPayload: toPlainJson(executorResult.operation),
      success: false,
      normalizationError: null,
    }

    if (debugPayload) {
      debugPayload.attempts.push(attemptDebug)
    }

    emit?.({
      type: "phase_update",
      data: {
        phase: "reviewer",
        model: GEMINI_MODEL,
        message: "Revisando se a operacao realmente cumpre o pedido...",
      },
    })

    const reviewerResult = await callStructuredModel({
      models: candidateModels,
      promptText: buildReviewerPrompt({
        userPrompt,
        currentActivity,
        attachments,
        recentMessages,
        routerDecision: normalizedRouterDecision,
        planner: normalizedPlanner,
        operationResult: executorResult.operation,
      }),
      systemInstruction: reviewerSystemInstruction,
      jsonSchema: reviewerJsonSchema,
      parser: z.object({
        approved: z.boolean(),
        feedback: z.string().trim().min(1).max(500),
      }),
    })

    pushWorkflowStage(debugPayload, {
      stage: "reviewer",
      model: reviewerResult.model,
      startedAt: reviewerResult.startedAt,
      durationMs: reviewerResult.durationMs,
      promptText: reviewerResult.promptText,
      responseText: reviewerResult.responseText,
      parsedJson: toPlainJson(reviewerResult.parsed),
      usageMetadata: reviewerResult.usageMetadata ?? null,
      success: reviewerResult.parsed.approved,
      error: reviewerResult.parsed.approved ? null : reviewerResult.parsed.feedback,
    })

    if (!reviewerResult.parsed.approved) {
      attemptDebug.normalizationError = reviewerResult.parsed.feedback

      emit?.({
        type: "attempt_complete",
        data: {
          attemptNumber: executorAttemptNumber,
          model: executorResult.model,
          success: false,
          durationMs: executorResult.durationMs,
          totalTokenCount:
            typeof executorResult.usageMetadata === "object" &&
            executorResult.usageMetadata &&
            "totalTokenCount" in executorResult.usageMetadata
              ? (executorResult.usageMetadata as { totalTokenCount?: number }).totalTokenCount ?? null
              : null,
          normalizationError: reviewerResult.parsed.feedback,
        },
      })

      feedbackForExecutor = reviewerResult.parsed.feedback
      continue
    }

    attemptDebug.success = true

    emit?.({
      type: "attempt_complete",
      data: {
        attemptNumber: executorAttemptNumber,
        model: executorResult.model,
        success: true,
        durationMs: executorResult.durationMs,
        totalTokenCount:
          typeof executorResult.usageMetadata === "object" &&
          executorResult.usageMetadata &&
          "totalTokenCount" in executorResult.usageMetadata
            ? (executorResult.usageMetadata as { totalTokenCount?: number }).totalTokenCount ?? null
            : null,
        normalizationError: null,
      },
    })

    emit?.({
      type: "phase_update",
      data: {
        phase: "patch",
        model: null,
        message: "Aplicando patch na atividade atual...",
      },
    })

    const nextActivity = currentActivity
      ? activitySchema.parse(applyActivityOperation(currentActivity, executorResult.operation))
      : executorResult.operation.action === "full_regeneration"
        ? activitySchema.parse(executorResult.operation.payload.activity)
        : currentActivity

    if (debugPayload) {
      debugPayload.finalOperation = toPlainJson(executorResult.operation)
    }

    return {
      operation: executorResult.operation,
      activity: nextActivity,
      assistantMessage: buildAssistantMessage(
        executorResult.operation,
        nextActivity,
        normalizedRouterDecision
      ),
      model: executorResult.model,
      routerDecision: normalizedRouterDecision,
      planner: normalizedPlanner,
    }
  }

  throw new Error(
    "A IA nao conseguiu produzir uma operacao aprovada pelo revisor dentro do limite de iteracoes."
  )
}
