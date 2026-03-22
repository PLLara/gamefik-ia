import type { Activity } from "@/lib/activity-schema"

export type DebugAttachmentSummary = {
  name: string
  mimeType: string
  size: number
}

export type DebugGenerationRequestConfig = {
  model: string
  apiVersion: string
  temperature: number
  responseMimeType: string
}

export type DebugUsageMetadata = {
  cacheTokensDetails?: unknown
  cachedContentTokenCount?: number
  candidatesTokenCount?: number
  candidatesTokensDetails?: unknown
  promptTokenCount?: number
  promptTokensDetails?: unknown
  thoughtsTokenCount?: number
  toolUsePromptTokenCount?: number
  toolUsePromptTokensDetails?: unknown
  totalTokenCount?: number
  trafficType?: string
} | null

export type DebugCandidateSummary = {
  index: number | null
  tokenCount: number | null
  finishReason: string | null
  finishMessage: string | null
  avgLogprobs: number | null
  text: string | null
  content: unknown
  safetyRatings: unknown
}

export type DebugStreamChunk = {
  chunkIndex: number
  receivedAt: string
  textDelta: string
}

export type DebugGenerationAttempt = {
  attemptNumber: number
  startedAt: string
  durationMs: number
  promptText: string
  requestConfig: DebugGenerationRequestConfig
  responseText: string | null
  responseId: string | null
  modelVersion: string | null
  usageMetadata: DebugUsageMetadata
  promptFeedback: unknown
  candidates: DebugCandidateSummary[]
  streamChunks: DebugStreamChunk[]
  parsedResponseJson: unknown
  normalizedPayload: unknown
  success: boolean
  normalizationError: string | null
}

export type GenerationDebugPayload = {
  enabled: true
  localhostOnly: true
  requestHost: string | null
  model: string
  finalModel: string | null
  fallbackModel: string | null
  apiVersion: string
  systemInstruction: string
  basePrompt: string
  attachmentSummary: DebugAttachmentSummary[]
  startedAt: string
  completedAt: string | null
  totalDurationMs: number | null
  attempts: DebugGenerationAttempt[]
  finalNormalizedPayload: unknown
  finalActivity: Activity | null
  finalError: string | null
}
