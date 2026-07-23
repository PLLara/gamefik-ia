import { readFile } from "node:fs/promises"
import path from "node:path"
import { GoogleGenAI } from "@google/genai"

const API_KEY_ENV_NAMES = ["GEMINI_API_KEY", "GOOGLE_API_KEY"] as const

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-pro-preview"
export const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION?.trim() || "v1beta"

let cachedApiKey: string | null = null
let cachedClient: GoogleGenAI | null = null

function extractEnvValue(fileContents: string, envName: string) {
  const pattern = new RegExp(`^\\s*${envName}\\s*=\\s*(.*)\\s*$`, "m")
  const match = fileContents.match(pattern)

  if (!match) {
    return null
  }

  const rawValue = match[1]?.trim()

  if (!rawValue) {
    return null
  }

  const unquotedValue = rawValue.replace(/^['"]|['"]$/g, "").trim()

  return unquotedValue.length > 0 ? unquotedValue : null
}

async function readApiKeyFromEnvFiles() {
  const candidateFiles = [".env.local", ".env"]

  for (const fileName of candidateFiles) {
    try {
      const filePath = path.join(process.cwd(), fileName)
      const fileContents = await readFile(filePath, "utf8")

      for (const envName of API_KEY_ENV_NAMES) {
        const value = extractEnvValue(fileContents, envName)

        if (value) {
          return value
        }
      }
    } catch {
      continue
    }
  }

  return null
}

export async function getGeminiApiKey() {
  if (cachedApiKey) {
    return cachedApiKey
  }

  for (const envName of API_KEY_ENV_NAMES) {
    const value = process.env[envName]?.trim()

    if (value) {
      cachedApiKey = value
      return cachedApiKey
    }
  }

  const fileValue = await readApiKeyFromEnvFiles()

  if (fileValue) {
    cachedApiKey = fileValue
    return cachedApiKey
  }

  return null
}

export async function getGeminiClient() {
  if (cachedClient) {
    return cachedClient
  }

  const apiKey = await getGeminiApiKey()

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY nao configurada.")
  }

  cachedClient = new GoogleGenAI({
    apiKey,
    apiVersion: GEMINI_API_VERSION,
  })

  return cachedClient
}

function assertModelIsGemini(model: string) {
  if (/^(gpt-|o\d|chatgpt-|claude-|llama-)/i.test(model)) {
    throw new Error(
      `Modelo "${model}" não é do Gemini. ` +
        `Defina GEMINI_MODEL com um modelo Gemini (ex: gemini-2.5-flash).`
    )
  }
}

export function getGeminiThinkingConfig(model: string) {
  assertModelIsGemini(model)

  // Alguns modelos Pro exigem thinking habilitado e rejeitam budget zero.
  if (/gemini-3\.1-pro/i.test(model)) {
    return undefined
  }

  return {
    thinkingBudget: 0,
  }
}
