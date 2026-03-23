import { z } from "zod"
import {
  activityGenerationSchema,
  activityGenerationJsonSchema,
  activitySchema,
  createEntityId,
  isMissionActivity,
  isQuizActivity,
  missionProofTypeSchema,
  missionValidationSchema,
  relabelAlternatives,
  toActivityFromModel,
  type Activity,
  type QuizQuestion,
} from "@/lib/activity-schema"

export const activityOperationActionSchema = z.enum([
  "full_regeneration",
  "update_metadata",
  "append_questions",
  "replace_question",
  "mission_adjustment",
  "remove_question",
  "ask_clarification",
])

export const routerDecisionSchema = z.object({
  action: activityOperationActionSchema,
  reason: z.string().trim().min(1).max(400),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  needsClarification: z.boolean().default(false),
  clarificationQuestion: z.string().trim().max(400).nullable().default(null),
})

export const plannerMetadataFieldSchema = z.enum([
  "title",
  "description",
  "teacherMessage",
  "missionProofType",
  "missionValidation",
])

export const operationPlannerSchema = z.object({
  action: activityOperationActionSchema,
  scopeSummary: z.string().trim().min(1).max(500),
  targetQuestionId: z.string().trim().max(120).nullable().default(null),
  targetQuestionIndex: z.number().int().min(0).nullable().default(null),
  appendCount: z.number().int().min(1).max(10).nullable().default(null),
  fieldsToUpdate: z.array(plannerMetadataFieldSchema).max(5).default([]),
  preserveActivityType: z.boolean().default(true),
})

const metadataPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(800).optional(),
    teacherMessage: z.string().trim().min(1).max(400).optional(),
  })
  .refine(
    (payload) =>
      typeof payload.title === "string" ||
      typeof payload.description === "string" ||
      typeof payload.teacherMessage === "string",
    {
      message: "Pelo menos um campo de metadado precisa ser atualizado.",
    }
  )

const quizQuestionDraftSchema = z
  .object({
    enunciado: z.string().trim().min(1).max(600),
    alternatives: z
      .array(
        z.object({
          text: z.string().trim().min(1).max(240),
          correct: z.boolean(),
        })
      )
      .min(2)
      .max(6),
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

const appendQuestionsPayloadSchema = z.object({
  questions: z.array(quizQuestionDraftSchema).min(1).max(10),
})

const replaceQuestionPayloadSchema = z.object({
  questionId: z.string().trim().min(1).max(120),
  question: quizQuestionDraftSchema,
})

const missionAdjustmentPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(800).optional(),
    teacherMessage: z.string().trim().min(1).max(400).optional(),
    missionProofType: missionProofTypeSchema.optional(),
    missionValidation: missionValidationSchema.optional(),
  })
  .refine(
    (payload) =>
      typeof payload.title === "string" ||
      typeof payload.description === "string" ||
      typeof payload.teacherMessage === "string" ||
      typeof payload.missionProofType === "string" ||
      typeof payload.missionValidation === "string",
    {
      message: "Pelo menos um campo da missao precisa ser atualizado.",
    }
  )

const removeQuestionPayloadSchema = z.object({
  questionId: z.string().trim().min(1).max(120),
})

const askClarificationPayloadSchema = z.object({
  question: z.string().trim().min(1).max(400),
})

export const activityOperationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("full_regeneration"),
    payload: z.object({
      activity: activityGenerationSchema,
    }),
  }),
  z.object({
    action: z.literal("update_metadata"),
    payload: metadataPayloadSchema,
  }),
  z.object({
    action: z.literal("append_questions"),
    payload: appendQuestionsPayloadSchema,
  }),
  z.object({
    action: z.literal("replace_question"),
    payload: replaceQuestionPayloadSchema,
  }),
  z.object({
    action: z.literal("mission_adjustment"),
    payload: missionAdjustmentPayloadSchema,
  }),
  z.object({
    action: z.literal("remove_question"),
    payload: removeQuestionPayloadSchema,
  }),
  z.object({
    action: z.literal("ask_clarification"),
    payload: askClarificationPayloadSchema,
  }),
])

export type RouterDecision = z.infer<typeof routerDecisionSchema>
export type OperationPlanner = z.infer<typeof operationPlannerSchema>
export type ActivityOperation = z.infer<typeof activityOperationSchema>

function withQuestionIdentity(
  question: z.infer<typeof quizQuestionDraftSchema>
): QuizQuestion {
  return {
    ...question,
    id: createEntityId("question"),
    alternatives: relabelAlternatives(
      question.alternatives.map((alternative) => ({
        ...alternative,
        id: createEntityId("alternative"),
      }))
    ),
  }
}

export function applyActivityOperation(
  currentActivity: Activity | null,
  operation: ActivityOperation
) {
  if (operation.action === "ask_clarification") {
    return currentActivity
  }

  if (operation.action === "full_regeneration") {
    const nextActivity = activitySchema.parse(
      toActivityFromModel(activityGenerationSchema.parse(operation.payload.activity))
    )

    if (currentActivity) {
      return {
        ...nextActivity,
        id: currentActivity.id,
      }
    }

    return nextActivity
  }

  if (!currentActivity) {
    throw new Error("Nao existe atividade atual para aplicar esta operacao.")
  }

  if (operation.action === "update_metadata") {
    return {
      ...currentActivity,
      ...operation.payload,
    }
  }

  if (operation.action === "append_questions") {
    if (!isQuizActivity(currentActivity)) {
      throw new Error("Nao e possivel adicionar questoes em uma missao.")
    }

    return {
      ...currentActivity,
      quizQuestions: [
        ...currentActivity.quizQuestions,
        ...operation.payload.questions.map(withQuestionIdentity),
      ],
    }
  }

  if (operation.action === "replace_question") {
    if (!isQuizActivity(currentActivity)) {
      throw new Error("Nao e possivel substituir questoes em uma missao.")
    }

    return {
      ...currentActivity,
      quizQuestions: currentActivity.quizQuestions.map((question) =>
        question.id === operation.payload.questionId
          ? {
              ...withQuestionIdentity(operation.payload.question),
              id: question.id,
            }
          : question
      ),
    }
  }

  if (operation.action === "mission_adjustment") {
    if (!isMissionActivity(currentActivity)) {
      throw new Error("Nao e possivel ajustar configuracoes de missao em um quiz.")
    }

    return {
      ...currentActivity,
      ...operation.payload,
    }
  }

  if (operation.action === "remove_question") {
    if (!isQuizActivity(currentActivity)) {
      throw new Error("Nao e possivel remover questoes de uma missao.")
    }

    const nextQuestions = currentActivity.quizQuestions.filter(
      (question) => question.id !== operation.payload.questionId
    )

    if (nextQuestions.length === 0) {
      throw new Error("O quiz precisa manter pelo menos uma questao.")
    }

    return {
      ...currentActivity,
      quizQuestions: nextQuestions,
    }
  }

  return currentActivity
}

export const routerDecisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "reason", "confidence", "needsClarification", "clarificationQuestion"],
  properties: {
    action: { type: "string", enum: activityOperationActionSchema.options },
    reason: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    needsClarification: { type: "boolean" },
    clarificationQuestion: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  },
}

export const operationPlannerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "action",
    "scopeSummary",
    "targetQuestionId",
    "targetQuestionIndex",
    "appendCount",
    "fieldsToUpdate",
    "preserveActivityType",
  ],
  properties: {
    action: { type: "string", enum: activityOperationActionSchema.options },
    scopeSummary: { type: "string" },
    targetQuestionId: { anyOf: [{ type: "string" }, { type: "null" }] },
    targetQuestionIndex: { anyOf: [{ type: "number" }, { type: "null" }] },
    appendCount: { anyOf: [{ type: "number" }, { type: "null" }] },
    fieldsToUpdate: {
      type: "array",
      items: { type: "string", enum: plannerMetadataFieldSchema.options },
      maxItems: 5,
    },
    preserveActivityType: { type: "boolean" },
  },
}

export const activityOperationJsonSchema = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["action", "payload"],
      properties: {
        action: { type: "string", enum: ["full_regeneration"] },
        payload: {
          type: "object",
          additionalProperties: false,
          required: ["activity"],
          properties: {
            activity: activityGenerationJsonSchema,
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["action", "payload"],
      properties: {
        action: { type: "string", enum: ["update_metadata"] },
        payload: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            teacherMessage: { type: "string" },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["action", "payload"],
      properties: {
        action: { type: "string", enum: ["append_questions"] },
        payload: {
          type: "object",
          additionalProperties: false,
          required: ["questions"],
          properties: {
            questions: {
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
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["action", "payload"],
      properties: {
        action: { type: "string", enum: ["replace_question"] },
        payload: {
          type: "object",
          additionalProperties: false,
          required: ["questionId", "question"],
          properties: {
            questionId: { type: "string" },
            question: {
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
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["action", "payload"],
      properties: {
        action: { type: "string", enum: ["mission_adjustment"] },
        payload: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            teacherMessage: { type: "string" },
            missionProofType: { type: "string", enum: missionProofTypeSchema.options },
            missionValidation: { type: "string", enum: missionValidationSchema.options },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["action", "payload"],
      properties: {
        action: { type: "string", enum: ["remove_question"] },
        payload: {
          type: "object",
          additionalProperties: false,
          required: ["questionId"],
          properties: {
            questionId: { type: "string" },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["action", "payload"],
      properties: {
        action: { type: "string", enum: ["ask_clarification"] },
        payload: {
          type: "object",
          additionalProperties: false,
          required: ["question"],
          properties: {
            question: { type: "string" },
          },
        },
      },
    },
  ],
}

const activityGenerationLiteJsonSchema = {
  type: "object",
  properties: {
    type: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    teacherMessage: { type: "string" },
    attachmentContext: {
      type: "array",
      items: { type: "string" },
    },
    quizQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          enunciado: { type: "string" },
          points: { type: "number" },
          alternatives: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                correct: { type: "boolean" },
              },
            },
          },
        },
      },
    },
    missionProofType: { type: "string" },
    missionValidation: { type: "string" },
  },
}

export function getActivityOperationJsonSchema(
  action: z.infer<typeof activityOperationActionSchema>
) {
  switch (action) {
    case "full_regeneration":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["full_regeneration"] },
          payload: {
            type: "object",
            properties: {
              activity: activityGenerationLiteJsonSchema,
            },
            required: ["activity"],
          },
        },
        required: ["action", "payload"],
      }
    case "update_metadata":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["update_metadata"] },
          payload: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              teacherMessage: { type: "string" },
            },
          },
        },
        required: ["action", "payload"],
      }
    case "append_questions":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["append_questions"] },
          payload: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    enunciado: { type: "string" },
                    points: { type: "number" },
                    alternatives: {
                      type: "array",
                      items: {
                        type: "object",
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
            required: ["questions"],
          },
        },
        required: ["action", "payload"],
      }
    case "replace_question":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["replace_question"] },
          payload: {
            type: "object",
            properties: {
              questionId: { type: "string" },
              question: {
                type: "object",
                properties: {
                  enunciado: { type: "string" },
                  points: { type: "number" },
                  alternatives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        correct: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
            required: ["questionId", "question"],
          },
        },
        required: ["action", "payload"],
      }
    case "mission_adjustment":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["mission_adjustment"] },
          payload: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              teacherMessage: { type: "string" },
              missionProofType: { type: "string" },
              missionValidation: { type: "string" },
            },
          },
        },
        required: ["action", "payload"],
      }
    case "remove_question":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["remove_question"] },
          payload: {
            type: "object",
            properties: {
              questionId: { type: "string" },
            },
            required: ["questionId"],
          },
        },
        required: ["action", "payload"],
      }
    case "ask_clarification":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["ask_clarification"] },
          payload: {
            type: "object",
            properties: {
              question: { type: "string" },
            },
            required: ["question"],
          },
        },
        required: ["action", "payload"],
      }
  }
}
