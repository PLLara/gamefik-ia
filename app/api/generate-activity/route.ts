import { NextResponse } from "next/server"
import type { Candidate, Part } from "@google/genai"
import { buildActivityPrompt, activityGenerationSystemInstruction } from "@/lib/activity-prompts"
import {
  activityGenerationJsonSchema,
  activitySchema,
  normalizeActivityGenerationPayload,
  toActivityFromModel,
} from "@/lib/activity-schema"
import { type DebugGenerationAttempt, type GenerationDebugPayload } from "@/lib/generation-debug"
import { GEMINI_API_VERSION, GEMINI_FALLBACK_MODEL, GEMINI_MODEL, getGeminiClient } from "@/lib/gemini"

export const runtime = "nodejs"

const MAX_ATTACHMENT_COUNT = 4
const MAX_TOTAL_ATTACHMENT_BYTES = 14 * 1024 * 1024
const MAX_SINGLE_ATTACHMENT_BYTES = 8 * 1024 * 1024
const LOCAL_DEBUG_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

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
}) {
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
  }
}

export async function POST(request: Request) {
  const requestHost = getRequestHostname(request)
  const includeDebug = isLocalHostname(requestHost)
  const requestStartedAt = new Date()
  const startedAtMs = Date.now()
  const debugPayload: GenerationDebugPayload | null = includeDebug
    ? {
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
        startedAt: requestStartedAt.toISOString(),
        completedAt: null,
        totalDurationMs: null,
        attempts: [],
        finalNormalizedPayload: null,
        finalActivity: null,
        finalError: null,
      }
    : null

  const buildJsonResponse = (
    body: Record<string, unknown>,
    status: number,
    debugOverrides?: Partial<GenerationDebugPayload>
  ) => {
    if (!debugPayload) {
      return NextResponse.json(body, { status })
    }

    Object.assign(debugPayload, debugOverrides ?? {})
    debugPayload.completedAt = new Date().toISOString()
    debugPayload.totalDurationMs = Date.now() - startedAtMs

    return NextResponse.json(
      {
        ...body,
        debug: debugPayload,
      },
      { status }
    )
  }

  try {
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
      return buildJsonResponse(
        { error: "Descreva a atividade ou envie ao menos um anexo." },
        400,
        { finalError: "Descreva a atividade ou envie ao menos um anexo." }
      )
    }

    if (files.length > MAX_ATTACHMENT_COUNT) {
      return buildJsonResponse(
        { error: `Envie no maximo ${MAX_ATTACHMENT_COUNT} anexos por vez.` },
        400,
        { finalError: `Envie no maximo ${MAX_ATTACHMENT_COUNT} anexos por vez.` }
      )
    }

    let totalBytes = 0

    for (const file of files) {
      if (!isAcceptedMimeType(file.type)) {
        return buildJsonResponse(
          { error: `O arquivo "${file.name}" nao e suportado. Use apenas PDF ou imagem.` },
          400,
          { finalError: `O arquivo "${file.name}" nao e suportado. Use apenas PDF ou imagem.` }
        )
      }

      if (file.size > MAX_SINGLE_ATTACHMENT_BYTES) {
        return buildJsonResponse(
          { error: `O arquivo "${file.name}" excede o limite de 8 MB.` },
          400,
          { finalError: `O arquivo "${file.name}" excede o limite de 8 MB.` }
        )
      }

      totalBytes += file.size
    }

    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return buildJsonResponse(
        { error: "O total de anexos excede o limite de 14 MB por solicitacao." },
        400,
        { finalError: "O total de anexos excede o limite de 14 MB por solicitacao." }
      )
    }

    const gemini = await getGeminiClient()
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

    let lastError: unknown = null
    let previousResponseText = ""
    let attemptCounter = 0
    const candidateModels = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
      (modelName, index, array) => array.indexOf(modelName) === index
    )

    for (const activeModel of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        attemptCounter += 1
        const retryInstruction =
          attempt === 0
            ? activeModel === GEMINI_MODEL
              ? ""
              : `\n\nMUDANCA DE MODELO:\nA tentativa anterior com ${GEMINI_MODEL} nao produziu um JSON valido. Gere novamente agora com este modelo de fallback, obedecendo estritamente o schema.`
            : `\n\nCORRECAO OBRIGATORIA:\nSua resposta anterior nao seguiu o schema esperado. Gere novamente usando apenas os campos validos.\nMantenha os nomes exatos dos campos.\nNao misture texto solto com objetos dentro do array de alternativas.\nResposta anterior invalida:\n${previousResponseText.slice(0, 3000)}`

        const promptText = `${basePrompt}${retryInstruction}`
        const temperature = attempt === 0 ? 0.15 : 0.05

        const { response, responseText, startedAt, durationMs } = await requestGeminiActivity({
          gemini,
          model: activeModel,
          promptText,
          attachmentParts,
          temperature,
        })

        const attemptDebug: DebugGenerationAttempt | null = debugPayload
          ? {
              attemptNumber: attemptCounter,
              startedAt,
              durationMs,
              promptText,
              requestConfig: {
                model: activeModel,
                apiVersion: GEMINI_API_VERSION,
                temperature,
                responseMimeType: "application/json",
              },
              responseText: responseText || null,
              responseId: response.responseId ?? null,
              modelVersion: response.modelVersion ?? null,
              usageMetadata: toPlainJson(response.usageMetadata) ?? null,
              promptFeedback: toPlainJson(response.promptFeedback),
              candidates: response.candidates?.map(serializeCandidate) ?? [],
              parsedResponseJson: null,
              normalizedPayload: null,
              success: false,
              normalizationError: null,
            }
          : null

        if (attemptDebug) {
          debugPayload?.attempts.push(attemptDebug)
        }

        if (!responseText) {
          lastError = new Error("A resposta da IA veio vazia. Tente novamente com mais contexto.")
          if (attemptDebug) {
            attemptDebug.normalizationError = "A resposta da IA veio vazia."
          }
          continue
        }

        previousResponseText = responseText

        try {
          const parsedResponseJson = JSON.parse(responseText)
          const parsedGeneration = normalizeActivityGenerationPayload(parsedResponseJson)
          const normalizedActivity = activitySchema.parse(toActivityFromModel(parsedGeneration))

          if (attemptDebug) {
            attemptDebug.parsedResponseJson = toPlainJson(parsedResponseJson)
            attemptDebug.normalizedPayload = toPlainJson(parsedGeneration)
            attemptDebug.success = true
          }

          return buildJsonResponse(
            {
              activity: normalizedActivity,
              model: activeModel,
            },
            200,
            {
              finalModel: activeModel,
              finalNormalizedPayload: toPlainJson(parsedGeneration),
              finalActivity: normalizedActivity,
              finalError: null,
            }
          )
        } catch (error) {
          lastError = error

          if (attemptDebug) {
            attemptDebug.normalizationError =
              error instanceof Error
                ? error.message
                : "Falha ao interpretar ou validar a resposta da IA."

            if (responseText) {
              attemptDebug.parsedResponseJson = toPlainJson(
                (() => {
                  try {
                    return JSON.parse(responseText)
                  } catch {
                    return null
                  }
                })()
              )
            }
          }
        }
      }
    }

    throw lastError ?? new Error("Nao foi possivel gerar uma resposta valida da IA.")
  } catch (error) {
    if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
      return buildJsonResponse(
        {
          error:
            "A chave da API do Gemini nao foi configurada. Defina GEMINI_API_KEY antes de gerar atividades.",
        },
        500,
        {
          finalError:
            "A chave da API do Gemini nao foi configurada. Defina GEMINI_API_KEY antes de gerar atividades.",
        }
      )
    }

    if (error instanceof SyntaxError) {
      return buildJsonResponse(
        {
          error:
            "A IA retornou um JSON invalido. Tente novamente com um pedido mais especifico.",
        },
        502,
        {
          finalError:
            "A IA retornou um JSON invalido. Tente novamente com um pedido mais especifico.",
        }
      )
    }

    if (error instanceof Error && "issues" in error) {
      return buildJsonResponse(
        {
          error:
            "A IA respondeu em um formato inesperado. Tente novamente com um pedido mais especifico.",
          details: error.message,
        },
        502,
        {
          finalError:
            "A IA respondeu em um formato inesperado. Tente novamente com um pedido mais especifico.",
        }
      )
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel gerar a atividade no momento."

    return buildJsonResponse(
      {
        error: message,
      },
      500,
      {
        finalError: message,
      }
    )
  }
}
