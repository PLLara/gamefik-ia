import { NextResponse } from "next/server"
import type { Candidate, GenerateContentResponse, Part } from "@google/genai"
import { buildActivityPrompt, activityGenerationSystemInstruction } from "@/lib/activity-prompts"
import {
  activityGenerationJsonSchema,
  activitySchema,
  normalizeActivityGenerationPayload,
  toActivityFromModel,
} from "@/lib/activity-schema"
import {
  type DebugGenerationAttempt,
  type DebugStreamChunk,
  type GenerationDebugPayload,
} from "@/lib/generation-debug"
import {
  GEMINI_API_VERSION,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL,
  getGeminiClient,
} from "@/lib/gemini"

export const runtime = "nodejs"

const MAX_ATTACHMENT_COUNT = 4
const MAX_TOTAL_ATTACHMENT_BYTES = 14 * 1024 * 1024
const MAX_SINGLE_ATTACHMENT_BYTES = 8 * 1024 * 1024
const LOCAL_DEBUG_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

type PreparedRequest = {
  normalizedPrompt: string
  files: File[]
  attachmentParts: Part[]
  basePrompt: string
}

type ValidationError = {
  status: number
  error: string
}

type AttemptResult = {
  response: GenerateContentResponse | null
  responseText: string
  startedAt: string
  durationMs: number
  streamChunks: DebugStreamChunk[]
}

type StreamingEvent =
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
        activity: unknown
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

function isAcceptedMimeType(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/")
}

function isLocalHostname(hostname: string | null) {
  if (!hostname) {
    return false
  }

  return LOCAL_DEBUG_HOSTS.has(hostname) || hostname.endsWith(".localhost")
}

function extractHostname(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).hostname
  } catch {
    return value.split(",")[0]?.trim().split(":")[0] ?? null
  }
}

function getRequestHostname(request: Request) {
  const candidates = [
    request.url,
    request.headers.get("origin"),
    request.headers.get("referer"),
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
  ]

  for (const candidate of candidates) {
    const hostname = extractHostname(candidate)

    if (hostname) {
      return hostname
    }
  }

  return null
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

function extractCandidateText(candidate: Candidate) {
  const text = candidate.content?.parts
    ?.map((part) => part.text)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n\n")
    .trim()

  return text && text.length > 0 ? text : null
}

function serializeCandidate(candidate: Candidate) {
  return {
    index: candidate.index ?? null,
    tokenCount: candidate.tokenCount ?? null,
    finishReason: candidate.finishReason ? String(candidate.finishReason) : null,
    finishMessage: candidate.finishMessage ?? null,
    avgLogprobs: candidate.avgLogprobs ?? null,
    text: extractCandidateText(candidate),
    content: toPlainJson(candidate.content),
    safetyRatings: toPlainJson(candidate.safetyRatings),
  }
}

async function fileToInlinePart(file: File): Promise<Part> {
  const buffer = Buffer.from(await file.arrayBuffer())

  return {
    inlineData: {
      mimeType: file.type,
      data: buffer.toString("base64"),
    },
  }
}

function createDebugPayload(includeDebug: boolean, requestHost: string | null) {
  if (!includeDebug) {
    return null
  }

  return {
    enabled: true,
    localhostOnly: true,
    requestHost,
    model: GEMINI_MODEL,
    finalModel: null,
    fallbackModel: GEMINI_FALLBACK_MODEL === GEMINI_MODEL ? null : GEMINI_FALLBACK_MODEL,
    apiVersion: GEMINI_API_VERSION,
    systemInstruction: activityGenerationSystemInstruction,
    basePrompt: "",
    attachmentSummary: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalDurationMs: null,
    attempts: [] as DebugGenerationAttempt[],
    finalNormalizedPayload: null,
    finalActivity: null,
    finalError: null,
  } as GenerationDebugPayload
}

function finalizeDebugPayload(
  debugPayload: GenerationDebugPayload | null,
  startedAtMs: number,
  overrides?: Partial<GenerationDebugPayload>
) {
  if (!debugPayload) {
    return null
  }

  Object.assign(debugPayload, overrides ?? {})
  debugPayload.completedAt = new Date().toISOString()
  debugPayload.totalDurationMs = Date.now() - startedAtMs

  return debugPayload
}

function buildJsonResponse(
  body: Record<string, unknown>,
  status: number,
  debugPayload: GenerationDebugPayload | null,
  startedAtMs: number,
  debugOverrides?: Partial<GenerationDebugPayload>
) {
  const finalizedDebug = finalizeDebugPayload(debugPayload, startedAtMs, debugOverrides)

  if (!finalizedDebug) {
    return NextResponse.json(body, { status })
  }

  return NextResponse.json(
    {
      ...body,
      debug: finalizedDebug,
    },
    { status }
  )
}

async function prepareRequest(
  request: Request,
  debugPayload: GenerationDebugPayload | null
) {
  const formData = await request.formData()
  const prompt = formData.get("prompt")
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File)
  const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : ""

  if (debugPayload) {
    debugPayload.attachmentSummary = files.map((file) => ({
      name: file.name,
      mimeType: file.type,
      size: file.size,
    }))
  }

  if (!normalizedPrompt && files.length === 0) {
    return {
      validationError: {
        status: 400,
        error: "Descreva a atividade ou envie ao menos um anexo.",
      } satisfies ValidationError,
    }
  }

  if (files.length > MAX_ATTACHMENT_COUNT) {
    return {
      validationError: {
        status: 400,
        error: `Envie no maximo ${MAX_ATTACHMENT_COUNT} anexos por vez.`,
      } satisfies ValidationError,
    }
  }

  let totalBytes = 0

  for (const file of files) {
    if (!isAcceptedMimeType(file.type)) {
      return {
        validationError: {
          status: 400,
          error: `O arquivo "${file.name}" nao e suportado. Use apenas PDF ou imagem.`,
        } satisfies ValidationError,
      }
    }

    if (file.size > MAX_SINGLE_ATTACHMENT_BYTES) {
      return {
        validationError: {
          status: 400,
          error: `O arquivo "${file.name}" excede o limite de 8 MB.`,
        } satisfies ValidationError,
      }
    }

    totalBytes += file.size
  }

  if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return {
      validationError: {
        status: 400,
        error: "O total de anexos excede o limite de 14 MB por solicitacao.",
      } satisfies ValidationError,
    }
  }

  const attachmentParts = await Promise.all(files.map(fileToInlinePart))
  const basePrompt = buildActivityPrompt({
    userPrompt: normalizedPrompt,
    attachments: files.map((file) => ({
      name: file.name,
      mimeType: file.type,
      size: file.size,
    })),
  })

  if (debugPayload) {
    debugPayload.basePrompt = basePrompt
  }

  return {
    preparedRequest: {
      normalizedPrompt,
      files,
      attachmentParts,
      basePrompt,
    } satisfies PreparedRequest,
  }
}

async function requestGeminiActivity({
  gemini,
  model,
  promptText,
  attachmentParts,
  temperature,
}: {
  gemini: Awaited<ReturnType<typeof getGeminiClient>>
  model: string
  promptText: string
  attachmentParts: Part[]
  temperature: number
}): Promise<AttemptResult> {
  const startedAt = new Date()
  const startedAtMs = Date.now()

  const response = await gemini.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: promptText,
          },
          ...attachmentParts,
        ],
      },
    ],
    config: {
      temperature,
      responseMimeType: "application/json",
      responseJsonSchema: activityGenerationJsonSchema,
      systemInstruction: activityGenerationSystemInstruction,
    },
  })

  return {
    response,
    responseText: response.text?.trim() ?? "",
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAtMs,
    streamChunks: [],
  }
}

async function requestGeminiActivityStream({
  gemini,
  model,
  promptText,
  attachmentParts,
  temperature,
  onChunk,
}: {
  gemini: Awaited<ReturnType<typeof getGeminiClient>>
  model: string
  promptText: string
  attachmentParts: Part[]
  temperature: number
  onChunk?: (chunk: DebugStreamChunk) => void
}): Promise<AttemptResult> {
  const startedAt = new Date()
  const startedAtMs = Date.now()
  const stream = await gemini.models.generateContentStream({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: promptText,
          },
          ...attachmentParts,
        ],
      },
    ],
    config: {
      temperature,
      responseMimeType: "application/json",
      responseJsonSchema: activityGenerationJsonSchema,
      systemInstruction: activityGenerationSystemInstruction,
    },
  })

  let responseText = ""
  let lastChunk: GenerateContentResponse | null = null
  let chunkIndex = 0
  const streamChunks: DebugStreamChunk[] = []

  for await (const chunk of stream) {
    lastChunk = chunk
    const textDelta = chunk.text ?? ""

    if (!textDelta) {
      continue
    }

    chunkIndex += 1
    responseText += textDelta

    const debugChunk: DebugStreamChunk = {
      chunkIndex,
      receivedAt: new Date().toISOString(),
      textDelta,
    }

    streamChunks.push(debugChunk)
    onChunk?.(debugChunk)
  }

  return {
    response: lastChunk,
    responseText: responseText.trim(),
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAtMs,
    streamChunks,
  }
}

function buildAttemptDebug({
  attemptNumber,
  model,
  temperature,
  promptText,
  attemptResult,
}: {
  attemptNumber: number
  model: string
  temperature: number
  promptText: string
  attemptResult: AttemptResult
}): DebugGenerationAttempt {
  return {
    attemptNumber,
    startedAt: attemptResult.startedAt,
    durationMs: attemptResult.durationMs,
    promptText,
    requestConfig: {
      model,
      apiVersion: GEMINI_API_VERSION,
      temperature,
      responseMimeType: "application/json",
    },
    responseText: attemptResult.responseText || null,
    responseId: attemptResult.response?.responseId ?? null,
    modelVersion: attemptResult.response?.modelVersion ?? null,
    usageMetadata: toPlainJson(attemptResult.response?.usageMetadata) ?? null,
    promptFeedback: toPlainJson(attemptResult.response?.promptFeedback),
    candidates: attemptResult.response?.candidates?.map(serializeCandidate) ?? [],
    streamChunks: attemptResult.streamChunks,
    parsedResponseJson: null,
    normalizedPayload: null,
    success: false,
    normalizationError: null,
  }
}

function resolveStatusAndMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
    return {
      status: 500,
      error:
        "A chave da API do Gemini nao foi configurada. Defina GEMINI_API_KEY antes de gerar atividades.",
      details: null,
    }
  }

  if (error instanceof SyntaxError) {
    return {
      status: 502,
      error: "A IA retornou um JSON invalido. Tente novamente com um pedido mais especifico.",
      details: null,
    }
  }

  if (error instanceof Error && "issues" in error) {
    return {
      status: 502,
      error:
        "A IA respondeu em um formato inesperado. Tente novamente com um pedido mais especifico.",
      details: error.message,
    }
  }

  return {
    status: 500,
    error:
      error instanceof Error ? error.message : "Nao foi possivel gerar a atividade no momento.",
    details: null,
  }
}

export async function POST(request: Request) {
  const requestHost = getRequestHostname(request)
  const includeDebug = isLocalHostname(requestHost)
  const startedAtMs = Date.now()
  const debugPayload = createDebugPayload(includeDebug, requestHost)
  const streamPreviewRequested = request.headers.get("x-gamefik-stream-preview") === "1"

  const prepared = await prepareRequest(request, debugPayload)
  const validationError = "validationError" in prepared ? prepared.validationError : null

  if (validationError) {
    if (!streamPreviewRequested) {
      return buildJsonResponse(
        { error: validationError.error },
        validationError.status,
        debugPayload,
        startedAtMs,
        { finalError: validationError.error }
      )
    }

    const encoder = new TextEncoder()
    const streamBody = new ReadableStream({
      start(controller) {
        const finalDebug = finalizeDebugPayload(debugPayload, startedAtMs)
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "final_error",
              data: {
                error: validationError.error,
                details: null,
                httpStatus: validationError.status,
                debug: finalDebug,
              },
            } satisfies StreamingEvent)}\n`
          )
        )
        controller.close()
      },
    })

    return new Response(streamBody, {
      status: validationError.status,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  const preparedRequest = "preparedRequest" in prepared ? prepared.preparedRequest : null

  if (!preparedRequest) {
    throw new Error("Falha interna ao preparar a solicitacao.")
  }

  const gemini = await getGeminiClient()
  const candidateModels = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
    (modelName, index, array) => array.indexOf(modelName) === index
  )

  const performAttemptLoop = async ({
    streaming,
    emit,
  }: {
    streaming: boolean
    emit?: (event: StreamingEvent) => void
  }) => {
    let lastError: unknown = null
    let previousResponseText = ""
    let attemptCounter = 0

    for (const activeModel of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        attemptCounter += 1
        const retryInstruction =
          attempt === 0
            ? activeModel === GEMINI_MODEL
              ? ""
              : `\n\nMUDANCA DE MODELO:\nA tentativa anterior com ${GEMINI_MODEL} nao produziu um JSON valido. Gere novamente agora com este modelo de fallback, obedecendo estritamente o schema.`
            : `\n\nCORRECAO OBRIGATORIA:\nSua resposta anterior nao seguiu o schema esperado. Gere novamente usando apenas os campos validos.\nMantenha os nomes exatos dos campos.\nNao misture texto solto com objetos dentro do array de alternativas.\nResposta anterior invalida:\n${previousResponseText.slice(0, 3000)}`

        const promptText = `${preparedRequest.basePrompt}${retryInstruction}`
        const temperature = attempt === 0 ? 0.15 : 0.05

        emit?.({
          type: "attempt_start",
          data: {
            attemptNumber: attemptCounter,
            model: activeModel,
            temperature,
          },
        })

        const attemptResult = streaming
          ? await requestGeminiActivityStream({
              gemini,
              model: activeModel,
              promptText,
              attachmentParts: preparedRequest.attachmentParts,
              temperature,
              onChunk: (chunk) => {
                emit?.({
                  type: "preview_delta",
                  data: {
                    attemptNumber: attemptCounter,
                    model: activeModel,
                    textDelta: chunk.textDelta,
                  },
                })
              },
            })
          : await requestGeminiActivity({
              gemini,
              model: activeModel,
              promptText,
              attachmentParts: preparedRequest.attachmentParts,
              temperature,
            })

        const attemptDebug = debugPayload
          ? buildAttemptDebug({
              attemptNumber: attemptCounter,
              model: activeModel,
              temperature,
              promptText,
              attemptResult,
            })
          : null

        if (attemptDebug && debugPayload) {
          debugPayload.attempts.push(attemptDebug)
        }

        if (!attemptResult.responseText) {
          lastError = new Error("A resposta da IA veio vazia. Tente novamente com mais contexto.")
          if (attemptDebug) {
            attemptDebug.normalizationError = "A resposta da IA veio vazia."
          }
          emit?.({
            type: "attempt_complete",
            data: {
              attemptNumber: attemptCounter,
              model: activeModel,
              success: false,
              durationMs: attemptResult.durationMs,
              totalTokenCount: attemptDebug?.usageMetadata?.totalTokenCount ?? null,
              normalizationError: "A resposta da IA veio vazia.",
            },
          })
          continue
        }

        previousResponseText = attemptResult.responseText

        try {
          const parsedResponseJson = JSON.parse(attemptResult.responseText)
          const parsedGeneration = normalizeActivityGenerationPayload(parsedResponseJson)
          const normalizedActivity = activitySchema.parse(toActivityFromModel(parsedGeneration))

          if (attemptDebug) {
            attemptDebug.parsedResponseJson = toPlainJson(parsedResponseJson)
            attemptDebug.normalizedPayload = toPlainJson(parsedGeneration)
            attemptDebug.success = true
          }

          emit?.({
            type: "attempt_complete",
            data: {
              attemptNumber: attemptCounter,
              model: activeModel,
              success: true,
              durationMs: attemptResult.durationMs,
              totalTokenCount: attemptDebug?.usageMetadata?.totalTokenCount ?? null,
              normalizationError: null,
            },
          })

          return {
            model: activeModel,
            parsedGeneration,
            normalizedActivity,
          }
        } catch (error) {
          lastError = error

          if (attemptDebug) {
            attemptDebug.normalizationError =
              error instanceof Error
                ? error.message
                : "Falha ao interpretar ou validar a resposta da IA."

            attemptDebug.parsedResponseJson = toPlainJson(
              (() => {
                try {
                  return JSON.parse(attemptResult.responseText)
                } catch {
                  return null
                }
              })()
            )
          }

          emit?.({
            type: "attempt_complete",
            data: {
              attemptNumber: attemptCounter,
              model: activeModel,
              success: false,
              durationMs: attemptResult.durationMs,
              totalTokenCount: attemptDebug?.usageMetadata?.totalTokenCount ?? null,
              normalizationError:
                error instanceof Error
                  ? error.message
                  : "Falha ao interpretar ou validar a resposta da IA.",
            },
          })
        }
      }
    }

    throw lastError ?? new Error("Nao foi possivel gerar uma resposta valida da IA.")
  }

  if (!streamPreviewRequested) {
    try {
      const result = await performAttemptLoop({ streaming: false })

      return buildJsonResponse(
        {
          activity: result.normalizedActivity,
          model: result.model,
        },
        200,
        debugPayload,
        startedAtMs,
        {
          finalModel: result.model,
          finalNormalizedPayload: toPlainJson(result.parsedGeneration),
          finalActivity: result.normalizedActivity,
          finalError: null,
        }
      )
    } catch (error) {
      const resolved = resolveStatusAndMessage(error)

      return buildJsonResponse(
        {
          error: resolved.error,
          ...(resolved.details ? { details: resolved.details } : {}),
        },
        resolved.status,
        debugPayload,
        startedAtMs,
        {
          finalError: resolved.error,
        }
      )
    }
  }

  const encoder = new TextEncoder()

  const streamBody = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamingEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      emit({
        type: "session",
        data: {
          model: GEMINI_MODEL,
          fallbackModel: GEMINI_FALLBACK_MODEL === GEMINI_MODEL ? null : GEMINI_FALLBACK_MODEL,
          apiVersion: GEMINI_API_VERSION,
          includeDebug,
        },
      })

      try {
        const result = await performAttemptLoop({ streaming: true, emit })
        const finalDebug = finalizeDebugPayload(debugPayload, startedAtMs, {
          finalModel: result.model,
          finalNormalizedPayload: toPlainJson(result.parsedGeneration),
          finalActivity: result.normalizedActivity,
          finalError: null,
        })

        emit({
          type: "final_result",
          data: {
            activity: result.normalizedActivity,
            model: result.model,
            debug: finalDebug,
          },
        })
      } catch (error) {
        const resolved = resolveStatusAndMessage(error)
        const finalDebug = finalizeDebugPayload(debugPayload, startedAtMs, {
          finalError: resolved.error,
        })

        emit({
          type: "final_error",
          data: {
            error: resolved.error,
            details: resolved.details,
            httpStatus: resolved.status,
            debug: finalDebug,
          },
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(streamBody, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
