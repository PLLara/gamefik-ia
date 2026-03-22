import { NextResponse } from "next/server"
import type { Part } from "@google/genai"
import { buildActivityPrompt, activityGenerationSystemInstruction } from "@/lib/activity-prompts"
import {
  activityGenerationJsonSchema,
  activitySchema,
  normalizeActivityGenerationPayload,
  toActivityFromModel,
} from "@/lib/activity-schema"
import { GEMINI_MODEL, getGeminiClient } from "@/lib/gemini"

export const runtime = "nodejs"

const MAX_ATTACHMENT_COUNT = 4
const MAX_TOTAL_ATTACHMENT_BYTES = 14 * 1024 * 1024
const MAX_SINGLE_ATTACHMENT_BYTES = 8 * 1024 * 1024

function isAcceptedMimeType(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/")
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
  promptText,
  attachmentParts,
  temperature = 0.2,
}: {
  gemini: Awaited<ReturnType<typeof getGeminiClient>>
  promptText: string
  attachmentParts: Part[]
  temperature?: number
}) {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
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

  return response.text?.trim() ?? ""
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt")
    const files = formData.getAll("attachments").filter((value): value is File => value instanceof File)

    const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : ""

    if (!normalizedPrompt && files.length === 0) {
      return NextResponse.json(
        { error: "Descreva a atividade ou envie ao menos um anexo." },
        { status: 400 }
      )
    }

    if (files.length > MAX_ATTACHMENT_COUNT) {
      return NextResponse.json(
        { error: `Envie no maximo ${MAX_ATTACHMENT_COUNT} anexos por vez.` },
        { status: 400 }
      )
    }

    let totalBytes = 0

    for (const file of files) {
      if (!isAcceptedMimeType(file.type)) {
        return NextResponse.json(
          { error: `O arquivo "${file.name}" nao e suportado. Use apenas PDF ou imagem.` },
          { status: 400 }
        )
      }

      if (file.size > MAX_SINGLE_ATTACHMENT_BYTES) {
        return NextResponse.json(
          { error: `O arquivo "${file.name}" excede o limite de 8 MB.` },
          { status: 400 }
        )
      }

      totalBytes += file.size
    }

    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: "O total de anexos excede o limite de 14 MB por solicitacao." },
        { status: 400 }
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

    let lastError: unknown = null
    let previousResponseText = ""

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const retryInstruction =
        attempt === 0
          ? ""
          : `\n\nCORRECAO OBRIGATORIA:\nSua resposta anterior nao seguiu o schema esperado. Gere novamente usando apenas os campos validos.\nMantenha os nomes exatos dos campos.\nNao misture texto solto com objetos dentro do array de alternativas.\nResposta anterior invalida:\n${previousResponseText.slice(0, 3000)}`

      const responseText = await requestGeminiActivity({
        gemini,
        promptText: `${basePrompt}${retryInstruction}`,
        attachmentParts,
      })

      if (!responseText) {
        lastError = new Error("A resposta da IA veio vazia. Tente novamente com mais contexto.")
        continue
      }

      previousResponseText = responseText

      try {
        const parsedGeneration = normalizeActivityGenerationPayload(JSON.parse(responseText))
        const normalizedActivity = activitySchema.parse(toActivityFromModel(parsedGeneration))

        return NextResponse.json({
          activity: normalizedActivity,
          model: GEMINI_MODEL,
        })
      } catch (error) {
        lastError = error
      }
    }

    throw lastError ?? new Error("Nao foi possivel gerar uma resposta valida da IA.")
  } catch (error) {
    if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        {
          error:
            "A chave da API do Gemini nao foi configurada. Defina GEMINI_API_KEY antes de gerar atividades.",
        },
        { status: 500 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error:
            "A IA retornou um JSON invalido. Tente novamente com um pedido mais especifico.",
        },
        { status: 502 }
      )
    }

    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        {
          error:
            "A IA respondeu em um formato inesperado. Tente novamente com um pedido mais especifico.",
          details: error.message,
        },
        { status: 502 }
      )
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel gerar a atividade no momento."

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    )
  }
}
