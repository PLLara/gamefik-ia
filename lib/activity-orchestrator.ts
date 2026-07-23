import type { GenerateContentResponse, Part } from "@google/genai"
import { z } from "zod"
import {
  activityOperationSchema,
  applyActivityOperation,
  getActivityOperationJsonSchema,
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
  getExecutorSystemInstruction,
  getPlannerSystemInstruction,
  reviewerJsonSchema,
  getReviewerSystemInstruction,
  getRouterSystemInstruction,
} from "@/lib/activity-operation-prompts"
import { type AttachmentDescriptor } from "@/lib/activity-prompts"
import { activitySchema, toActivityFromModel, type Activity } from "@/lib/activity-schema"
import {
  type DebugGenerationAttempt,
  type DebugStreamChunk,
  type DebugWorkflowStage,
  type GenerationDebugPayload,
} from "@/lib/generation-debug"
import {
  GEMINI_API_VERSION,
  GEMINI_MODEL,
  getGeminiClient,
  getGeminiThinkingConfig,
} from "@/lib/gemini"
import { getStrings, type SupportedLanguage } from "@/lib/i18n"

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
  systemInstruction: string
  parsed: T
  promptText: string
  responseText: string
  startedAt: string
  durationMs: number
  usageMetadata: unknown
}

type ExecutorResult = {
  model: string
  systemInstruction: string
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
  language: SupportedLanguage
  emit?: (event: OrchestrationEvent) => void
}

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

function setDebugPromptContext(
  debugPayload: GenerationDebugPayload | null,
  systemInstruction: string,
  promptText: string
) {
  if (!debugPayload) {
    return
  }

  debugPayload.systemInstruction = systemInstruction
  debugPayload.basePrompt = promptText
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallbackMessage
}

function toModelStageError(stage: DebugWorkflowStage["stage"], model: string, error: unknown) {
  const message = getErrorMessage(error, `Falha ao executar a etapa ${stage}.`)

  return new Error(`Falha na etapa ${stage} com o modelo ${model}: ${message}`)
}

async function callStructuredModel<T>({
  stage,
  model,
  promptText,
  systemInstruction,
  jsonSchema,
  parser,
  debugPayload,
}: {
  stage: DebugWorkflowStage["stage"]
  model: string
  promptText: string
  systemInstruction: string
  jsonSchema: unknown
  parser: z.ZodSchema<T>
  debugPayload: GenerationDebugPayload | null
}) {
  const gemini = await getGeminiClient()
  const startedAt = new Date()
  const startedAtMs = Date.now()

  setDebugPromptContext(debugPayload, systemInstruction, promptText)

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
        ...(getGeminiThinkingConfig(model)
          ? {
              thinkingConfig: getGeminiThinkingConfig(model),
            }
          : {}),
      },
    })

    const responseText = response.text?.trim() ?? ""
    const parsed = parser.parse(JSON.parse(responseText))

    return {
      model,
      systemInstruction,
      parsed,
      promptText,
      responseText,
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAtMs,
      usageMetadata: toPlainJson(response.usageMetadata),
    } satisfies StructuredStageResult<T>
  } catch (error) {
    pushWorkflowStage(debugPayload, {
      stage,
      model,
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAtMs,
      systemInstruction,
      promptText,
      responseText: null,
      parsedJson: null,
      usageMetadata: null,
      success: false,
      error: getErrorMessage(error, `Falha ao executar a etapa ${stage}.`),
    })

    throw toModelStageError(stage, model, error)
  }
}

async function callExecutorStream({
  expectedAction,
  promptText,
  attachmentParts,
  emit,
  attemptNumber,
  debugPayload,
  systemInstruction,
}: {
  expectedAction: ActivityOperation["action"]
  promptText: string
  attachmentParts: Part[]
  emit?: (event: OrchestrationEvent) => void
  attemptNumber: number
  debugPayload: GenerationDebugPayload | null
  systemInstruction: string
}) {
  const gemini = await getGeminiClient()
  const model = GEMINI_MODEL
  const startedAt = new Date()
  const startedAtMs = Date.now()
  const streamChunks: DebugStreamChunk[] = []
  let responseText = ""
  let lastChunk: GenerateContentResponse | null = null

  setDebugPromptContext(debugPayload, systemInstruction, promptText)

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
        responseJsonSchema: getActivityOperationJsonSchema(expectedAction),
        systemInstruction,
        ...(getGeminiThinkingConfig(model)
          ? {
              thinkingConfig: getGeminiThinkingConfig(model),
            }
          : {}),
      },
    })

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
      systemInstruction,
      operation,
      promptText,
      responseText,
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAtMs,
      usageMetadata: toPlainJson(lastChunk?.usageMetadata) ?? null,
      streamChunks,
    } satisfies ExecutorResult
  } catch (error) {
    const durationMs = Date.now() - startedAtMs
    const normalizationError = getErrorMessage(error, "Falha ao executar a operacao com este modelo.")

    if (debugPayload) {
      debugPayload.attempts.push({
        attemptNumber,
        startedAt: startedAt.toISOString(),
        durationMs,
        systemInstruction,
        promptText,
        requestConfig: {
          model,
          apiVersion: GEMINI_API_VERSION,
          temperature: 0.15,
          responseMimeType: "application/json",
        },
        responseText: responseText || null,
        responseId: null,
        modelVersion: model,
        usageMetadata: toPlainJson(lastChunk?.usageMetadata) ?? null,
        promptFeedback: null,
        candidates: [],
        streamChunks,
        parsedResponseJson: null,
        normalizedPayload: null,
        success: false,
        normalizationError,
      })
    }

    emit?.({
      type: "attempt_complete",
      data: {
        attemptNumber,
        model,
        success: false,
        durationMs,
        totalTokenCount: null,
        normalizationError,
      },
    })

    throw new Error(`Falha no executor com o modelo ${model}: ${normalizationError}`)
  }
}

function buildAssistantMessage(
  operation: ActivityOperation,
  nextActivity: Activity | null,
  routerDecision: RouterDecision,
  language: SupportedLanguage
) {
  const strings = getStrings(language).assistantMessage

  if (operation.action === "ask_clarification") {
    return (operation.payload as { question: string }).question
  }

  if (operation.action === "append_questions" && nextActivity?.type === "quiz") {
    return strings.appendQuestions(operation.payload.questions.length)
  }

  if (operation.action === "update_metadata") {
    return strings.updateMetadata
  }

  if (operation.action === "replace_question") {
    return strings.replaceQuestion
  }

  if (operation.action === "mission_adjustment") {
    return strings.missionAdjustment
  }

  if (operation.action === "remove_question") {
    return strings.removeQuestion
  }

  if (operation.action === "full_regeneration") {
    return nextActivity?.teacherMessage ?? routerDecision.reason
  }

  return routerDecision.reason
}

function stripPromptMetadata(userPrompt: string) {
  return userPrompt.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim()
}

function isSpecificSourceDependentTopic(prompt: string) {
  return (
    /\b(manual|modelo|model|versao|versão|ficha tecnica|especifica(?:cao|ções)|pdf|documento|arquivo)\b/i.test(
      prompt
    ) ||
    /\b[a-z]+\s?\d+(?:\.\d+)?\b/i.test(prompt) ||
    /\bs-?design\b/i.test(prompt)
  )
}

function getPreRoutingClarificationQuestion({
  userPrompt,
  currentActivity,
  attachments,
  language,
}: Pick<OrchestrationOptions, "userPrompt" | "currentActivity" | "attachments" | "language">) {
  const strings = getStrings(language)

  if (currentActivity || attachments.length > 0) {
    return null
  }

  const strippedPrompt = stripPromptMetadata(userPrompt)

  if (!strippedPrompt) {
    return strings.preRoutingClarification.emptyPrompt
  }

  const wordCount = strippedPrompt.split(/\s+/).filter(Boolean).length
  const hasInstructionalContext =
    /\b(sobre|com base|baseado|a partir|usando|considere|explique|aborde|compare|inclua|objetivo|contexto|material|texto|artigo|capitulo|pdf|imagem|documento|manual|resumo|conteudo|tema|about|based on|using|consider|explain|include|objective|context|material|text|article|chapter|summary|theme)\b/i.test(
      strippedPrompt
    )
  const looksLikeBareTopic =
    wordCount <= 8 && !/[.!?]/.test(strippedPrompt) && !hasInstructionalContext

  if (!looksLikeBareTopic) {
    return null
  }

  if (!isSpecificSourceDependentTopic(strippedPrompt)) {
    return null
  }

  return strings.preRoutingClarification.bareTopic(strippedPrompt)
}

export async function orchestrateActivityOperation({
  userPrompt,
  currentActivity,
  attachments,
  attachmentParts,
  recentMessages,
  debugPayload,
  language,
  emit,
}: OrchestrationOptions): Promise<OrchestrationResult> {
  const strings = getStrings(language)

  emit?.({
    type: "phase_update",
    data: {
      phase: "router",
      model: GEMINI_MODEL,
      message: strings.routerPhaseMessages.analyzing,
    },
  })

  const preRoutingClarificationQuestion = getPreRoutingClarificationQuestion({
    userPrompt,
    currentActivity,
    attachments,
    language,
  })

  if (preRoutingClarificationQuestion) {
    const clarificationOperation = activityOperationSchema.parse({
      action: "ask_clarification",
      payload: {
        question: preRoutingClarificationQuestion,
      },
    }) as Extract<ActivityOperation, { action: "ask_clarification" }>

    if (debugPayload) {
      debugPayload.systemInstruction = getRouterSystemInstruction(language)
      debugPayload.basePrompt = buildRouterPrompt({
        userPrompt,
        currentActivity,
        attachments,
        recentMessages,
      }, language)
      debugPayload.finalOperation = toPlainJson(clarificationOperation)
      debugPayload.finalNormalizedPayload = toPlainJson(clarificationOperation)
    }

    emit?.({
      type: "phase_update",
      data: {
        phase: "clarification",
        model: null,
        message: strings.routerPhaseMessages.clarificationNeeded,
      },
    })

    return {
      operation: clarificationOperation,
      activity: currentActivity,
      assistantMessage: clarificationOperation.payload.question,
      model: GEMINI_MODEL,
      routerDecision: normalizeRouterDecision({
        action: "ask_clarification",
        reason: "O pedido inicial nao trouxe base factual suficiente para gerar uma atividade confiavel.",
        confidence: "high",
        needsClarification: true,
        clarificationQuestion: preRoutingClarificationQuestion,
      }),
      planner: null,
    }
  }

  const routerResult = await callStructuredModel({
    stage: "router",
    model: GEMINI_MODEL,
    promptText: buildRouterPrompt({
      userPrompt,
      currentActivity,
      attachments,
      recentMessages,
    }, language),
    systemInstruction: getRouterSystemInstruction(language),
    jsonSchema: routerDecisionJsonSchema,
    parser: routerDecisionSchema,
    debugPayload,
  })
  const normalizedRouterDecision = normalizeRouterDecision(routerResult.parsed as RouterDecision)

  pushWorkflowStage(debugPayload, {
    stage: "router",
    model: routerResult.model,
    startedAt: routerResult.startedAt,
    durationMs: routerResult.durationMs,
    systemInstruction: routerResult.systemInstruction,
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
      message: strings.routerPhaseMessages.actionChosen(normalizedRouterDecision.action),
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
    stage: "planner",
    model: GEMINI_MODEL,
    promptText: buildPlannerPrompt({
      userPrompt,
      currentActivity,
      attachments,
      recentMessages,
      routerDecision: normalizedRouterDecision,
    }, language),
    systemInstruction: getPlannerSystemInstruction(language),
    jsonSchema: operationPlannerJsonSchema,
    parser: operationPlannerSchema,
    debugPayload,
  })
  const normalizedPlanner = normalizePlannerDecision(plannerResult.parsed as OperationPlanner)

  pushWorkflowStage(debugPayload, {
    stage: "planner",
    model: plannerResult.model,
    startedAt: plannerResult.startedAt,
    durationMs: plannerResult.durationMs,
    systemInstruction: plannerResult.systemInstruction,
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
            ? strings.executorPhaseMessages.executing
            : strings.executorPhaseMessages.refining(executorAttemptNumber),
      },
    })

    const executorPrompt = `${buildExecutorPrompt({
      userPrompt,
      currentActivity,
      attachments,
      recentMessages,
      routerDecision: normalizedRouterDecision,
      planner: normalizedPlanner,
    }, language)}${feedbackForExecutor ? `\n\nFeedback de revisao para corrigir:\n${feedbackForExecutor}` : ""}`

    const executorResult = await callExecutorStream({
      expectedAction: normalizedPlanner.action,
      promptText: executorPrompt,
      attachmentParts,
      emit,
      attemptNumber: executorAttemptNumber,
      debugPayload,
      systemInstruction: getExecutorSystemInstruction(language),
    })

    const attemptDebug: DebugGenerationAttempt = {
      attemptNumber: executorAttemptNumber,
      startedAt: executorResult.startedAt,
      durationMs: executorResult.durationMs,
      systemInstruction: executorResult.systemInstruction,
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
        message: strings.reviewerPhaseMessage,
      },
    })

    const reviewerResult = await callStructuredModel({
      stage: "reviewer",
      model: GEMINI_MODEL,
      promptText: buildReviewerPrompt({
        userPrompt,
        currentActivity,
        attachments,
        recentMessages,
        routerDecision: normalizedRouterDecision,
        planner: normalizedPlanner,
        operationResult: executorResult.operation,
      }, language),
      systemInstruction: getReviewerSystemInstruction(language),
      jsonSchema: reviewerJsonSchema,
      parser: z.object({
        approved: z.boolean(),
        feedback: z.string().trim().min(1).max(500),
      }),
      debugPayload,
    })

    pushWorkflowStage(debugPayload, {
      stage: "reviewer",
      model: reviewerResult.model,
      startedAt: reviewerResult.startedAt,
      durationMs: reviewerResult.durationMs,
      systemInstruction: reviewerResult.systemInstruction,
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
        message: strings.patchPhaseMessage,
      },
    })

    const nextActivity = currentActivity
      ? activitySchema.parse(applyActivityOperation(currentActivity, executorResult.operation))
      : executorResult.operation.action === "full_regeneration"
        ? activitySchema.parse(toActivityFromModel(executorResult.operation.payload.activity))
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
        normalizedRouterDecision,
        language
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
