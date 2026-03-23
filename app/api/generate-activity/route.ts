import { NextResponse } from "next/server"
import type { Part } from "@google/genai"
import { z } from "zod"
import { orchestrateActivityOperation, type OrchestrationEvent } from "@/lib/activity-orchestrator"
import { activitySchema } from "@/lib/activity-schema"
import { type GenerationDebugPayload } from "@/lib/generation-debug"
import { GEMINI_API_VERSION, GEMINI_MODEL } from "@/lib/gemini"

export const runtime = "nodejs"

const MAX_ATTACHMENT_COUNT = 4
const MAX_TOTAL_ATTACHMENT_BYTES = 14 * 1024 * 1024
const MAX_SINGLE_ATTACHMENT_BYTES = 8 * 1024 * 1024
const LOCAL_DEBUG_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

const recentMessagesSchema = z.array(
  z.object({
    role: z.enum(["user", "ai"]),
    content: z.string().trim().min(1).max(4000),
  })
)

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
    fallbackModel: null,
    apiVersion: GEMINI_API_VERSION,
    systemInstruction: "",
    basePrompt: "",
    attachmentSummary: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalDurationMs: null,
    workflowStages: [],
    attempts: [],
    finalOperation: null,
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

function resolveError(error: unknown) {
  if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
    return {
      status: 500,
      error:
        "A chave da API de IA nao foi configurada. Defina GEMINI_API_KEY antes de gerar atividades.",
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

  return {
    status: 500,
    error:
      error instanceof Error ? error.message : "Nao foi possivel processar a solicitacao da IA.",
    details: null,
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

function parseJsonField<T>(value: FormDataEntryValue | null, parser: z.ZodType<T>) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null
  }

  return parser.parse(JSON.parse(value))
}

export async function POST(request: Request) {
  const requestHost = getRequestHostname(request)
  const includeDebug = isLocalHostname(requestHost)
  const startedAtMs = Date.now()
  const debugPayload = createDebugPayload(includeDebug, requestHost)
  const streamPreviewRequested = request.headers.get("x-gamefik-stream-preview") === "1"

  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt")
    const files = formData.getAll("attachments").filter((value): value is File => value instanceof File)
    const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : ""
    const currentActivity = parseJsonField(formData.get("currentActivity"), activitySchema)
    const recentMessages =
      parseJsonField(formData.get("recentMessages"), recentMessagesSchema) ?? []

    if (debugPayload) {
      debugPayload.attachmentSummary = files.map((file) => ({
        name: file.name,
        mimeType: file.type,
        size: file.size,
      }))
    }

    if (!normalizedPrompt && files.length === 0) {
      return buildJsonResponse(
        { error: "Descreva a atividade ou envie ao menos um anexo." },
        400,
        debugPayload,
        startedAtMs,
        { finalError: "Descreva a atividade ou envie ao menos um anexo." }
      )
    }

    if (files.length > MAX_ATTACHMENT_COUNT) {
      return buildJsonResponse(
        { error: `Envie no maximo ${MAX_ATTACHMENT_COUNT} anexos por vez.` },
        400,
        debugPayload,
        startedAtMs,
        { finalError: `Envie no maximo ${MAX_ATTACHMENT_COUNT} anexos por vez.` }
      )
    }

    let totalBytes = 0

    for (const file of files) {
      if (!isAcceptedMimeType(file.type)) {
        return buildJsonResponse(
          { error: `O arquivo "${file.name}" nao e suportado. Use apenas PDF ou imagem.` },
          400,
          debugPayload,
          startedAtMs,
          { finalError: `O arquivo "${file.name}" nao e suportado. Use apenas PDF ou imagem.` }
        )
      }

      if (file.size > MAX_SINGLE_ATTACHMENT_BYTES) {
        return buildJsonResponse(
          { error: `O arquivo "${file.name}" excede o limite de 8 MB.` },
          400,
          debugPayload,
          startedAtMs,
          { finalError: `O arquivo "${file.name}" excede o limite de 8 MB.` }
        )
      }

      totalBytes += file.size
    }

    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return buildJsonResponse(
        { error: "O total de anexos excede o limite de 14 MB por solicitacao." },
        400,
        debugPayload,
        startedAtMs,
        { finalError: "O total de anexos excede o limite de 14 MB por solicitacao." }
      )
    }

    const attachmentParts = await Promise.all(files.map(fileToInlinePart))
    const attachments = files.map((file) => ({
      name: file.name,
      mimeType: file.type,
      size: file.size,
    }))

    if (!streamPreviewRequested) {
      const result = await orchestrateActivityOperation({
        userPrompt: normalizedPrompt,
        currentActivity,
        attachments,
        attachmentParts,
        recentMessages,
        debugPayload,
      })

      return buildJsonResponse(
        {
          operation: result.operation,
          activity: result.activity,
          assistantMessage: result.assistantMessage,
          model: result.model,
        },
        200,
        debugPayload,
        startedAtMs,
        {
          finalModel: result.model,
          finalOperation: toPlainJson(result.operation),
          finalNormalizedPayload: toPlainJson(result.operation),
          finalActivity: result.activity,
          finalError: null,
        }
      )
    }

    const encoder = new TextEncoder()
    const streamBody = new ReadableStream({
      async start(controller) {
        const emit = (event: OrchestrationEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        }

        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "session",
              data: {
                model: GEMINI_MODEL,
                fallbackModel: null,
                apiVersion: GEMINI_API_VERSION,
                includeDebug,
              },
            })}\n`
          )
        )

        try {
          const result = await orchestrateActivityOperation({
            userPrompt: normalizedPrompt,
            currentActivity,
            attachments,
            attachmentParts,
            recentMessages,
            debugPayload,
            emit,
          })

          const finalDebug = finalizeDebugPayload(debugPayload, startedAtMs, {
            finalModel: result.model,
            finalOperation: toPlainJson(result.operation),
            finalNormalizedPayload: toPlainJson(result.operation),
            finalActivity: result.activity,
            finalError: null,
          })

          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                type: "final_result",
                data: {
                  operation: result.operation,
                  activity: result.activity,
                  assistantMessage: result.assistantMessage,
                  model: result.model,
                  debug: finalDebug,
                },
              })}\n`
            )
          )
        } catch (error) {
          const resolved = resolveError(error)
          const finalDebug = finalizeDebugPayload(debugPayload, startedAtMs, {
            finalError: resolved.error,
          })

          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                type: "final_error",
                data: {
                  error: resolved.error,
                  details: resolved.details,
                  httpStatus: resolved.status,
                  debug: finalDebug,
                },
              })}\n`
            )
          )
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
  } catch (error) {
    const resolved = resolveError(error)

    return buildJsonResponse(
      {
        error: resolved.error,
        ...(resolved.details ? { details: resolved.details } : {}),
      },
      resolved.status,
      debugPayload,
      startedAtMs,
      { finalError: resolved.error }
    )
  }
}
