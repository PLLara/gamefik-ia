import type { Activity } from "@/lib/activity-schema"
import type { AttachmentDescriptor } from "@/lib/activity-prompts"
import type { OperationPlanner, RouterDecision } from "@/lib/activity-operation-schema"

type SharedPromptOptions = {
  userPrompt: string
  currentActivity: Activity | null
  attachments: AttachmentDescriptor[]
  recentMessages?: Array<{ role: "user" | "ai"; content: string }>
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAttachmentSection(attachments: AttachmentDescriptor[]) {
  if (attachments.length === 0) {
    return "Nenhum anexo enviado."
  }

  return attachments
    .map(
      (attachment, index) =>
        `${index + 1}. ${attachment.name} (${attachment.mimeType}, ${formatBytes(attachment.size)})`
    )
    .join("\n")
}

function formatRecentMessages(
  recentMessages: Array<{ role: "user" | "ai"; content: string }> | undefined
) {
  if (!recentMessages || recentMessages.length === 0) {
    return "Nenhum historico adicional."
  }

  return recentMessages
    .slice(-6)
    .map(
      (message, index) =>
        `${index + 1}. ${message.role === "user" ? "Usuario" : "Assistente"}: ${message.content}`
    )
    .join("\n")
}

export function summarizeActivityForPrompt(activity: Activity | null) {
  if (!activity) {
    return "Nenhuma atividade atual. O usuario quer criar algo novo."
  }

  if (activity.type === "quiz") {
    return JSON.stringify(
      {
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        teacherMessage: activity.teacherMessage,
        attachmentContext: activity.attachmentContext,
        quizQuestions: activity.quizQuestions.map((question, index) => ({
          id: question.id,
          index,
          enunciado: question.enunciado,
          points: question.points,
          alternatives: question.alternatives.map((alternative) => ({
            id: alternative.id,
            label: alternative.label,
            text: alternative.text,
            correct: alternative.correct,
          })),
        })),
      },
      null,
      2
    )
  }

  return JSON.stringify(activity, null, 2)
}

export const routerSystemInstruction = `
Voce e o roteador de intencao de um editor de atividades educacionais.

Sua funcao nao e gerar a atividade final. Sua funcao e decidir qual operacao deve ser executada.

Escolha sempre a menor operacao capaz de cumprir o pedido do usuario.

Regras:
- se o usuario pedir para mudar apenas titulo/descricao/mensagem, use "update_metadata";
- se pedir mais perguntas ou questoes adicionais, use "append_questions";
- se pedir para refazer uma questao especifica, use "replace_question";
- se pedir para ajustar detalhes de uma missao, use "mission_adjustment";
- se pedir para remover uma questao, use "remove_question";
- se o pedido exigir recriar tudo, use "full_regeneration";
- se o pedido estiver ambiguo ou faltar contexto critico, use "ask_clarification";
- responda apenas em JSON valido seguindo o schema.
`.trim()

export function buildRouterPrompt({
  userPrompt,
  currentActivity,
  attachments,
  recentMessages,
}: SharedPromptOptions) {
  return `
Analise o pedido do usuario e escolha a operacao correta.

Pedido atual:
${userPrompt.trim()}

Atividade atual:
${summarizeActivityForPrompt(currentActivity)}

Anexos:
${formatAttachmentSection(attachments)}

Historico recente:
${formatRecentMessages(recentMessages)}
`.trim()
}

export const plannerSystemInstruction = `
Voce e um planejador de operacoes para um editor de atividades educacionais.

Sua funcao e detalhar o que precisa ser produzido para executar a acao escolhida.

Regras:
- nao gere a atividade final;
- descreva o escopo da alteracao de forma objetiva;
- informe quantidade de questoes a adicionar quando fizer sentido;
- identifique alvo de questao quando fizer sentido;
- informe os campos que precisam ser atualizados;
- responda apenas em JSON valido seguindo o schema.
`.trim()

export function buildPlannerPrompt({
  userPrompt,
  currentActivity,
  attachments,
  recentMessages,
  routerDecision,
}: SharedPromptOptions & {
  routerDecision: RouterDecision
}) {
  return `
Planeje a execucao da operacao escolhida.

Pedido atual:
${userPrompt.trim()}

Decisao do roteador:
${JSON.stringify(routerDecision, null, 2)}

Atividade atual:
${summarizeActivityForPrompt(currentActivity)}

Anexos:
${formatAttachmentSection(attachments)}

Historico recente:
${formatRecentMessages(recentMessages)}
`.trim()
}

export const executorSystemInstruction = `
Voce e o executor de operacoes de um editor de atividades educacionais.

Sua missao e produzir apenas o payload da operacao escolhida, nunca um documento maior do que o necessario.

Regras essenciais:
- "update_metadata": altere apenas os campos solicitados;
- "append_questions": devolva apenas as novas questoes a adicionar;
- "replace_question": devolva apenas a questao substituta e o questionId alvo;
- "mission_adjustment": altere apenas campos da missao;
- "remove_question": devolva apenas o questionId alvo;
- "full_regeneration": so use a atividade inteira quando explicitamente necessario;
- "ask_clarification": devolva apenas a pergunta de esclarecimento;
- mantenha o conteudo em portugues do Brasil;
- responda apenas em JSON valido seguindo o schema.
`.trim()

export function buildExecutorPrompt({
  userPrompt,
  currentActivity,
  attachments,
  recentMessages,
  routerDecision,
  planner,
}: SharedPromptOptions & {
  routerDecision: RouterDecision
  planner: OperationPlanner
}) {
  return `
Execute a operacao planejada.

Pedido atual:
${userPrompt.trim()}

Decisao do roteador:
${JSON.stringify(routerDecision, null, 2)}

Plano:
${JSON.stringify(planner, null, 2)}

Atividade atual:
${summarizeActivityForPrompt(currentActivity)}

Anexos:
${formatAttachmentSection(attachments)}

Historico recente:
${formatRecentMessages(recentMessages)}
`.trim()
}

export const reviewerSystemInstruction = `
Voce e o revisor final de uma operacao de edicao de atividade.

Sua funcao e dizer se a operacao executada atende ao pedido do usuario.

Regras:
- aprove se a operacao cumpre exatamente o pedido;
- rejeite se a operacao for ampla demais, estreita demais, ou semanticamente errada;
- prefira operacoes parciais quando o pedido for parcial;
- "append_questions" nao pode recriar o quiz inteiro;
- "update_metadata" nao pode reescrever questoes;
- responda apenas em JSON valido.
`.trim()

export const reviewerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["approved", "feedback"],
  properties: {
    approved: { type: "boolean" },
    feedback: { type: "string" },
  },
}

export function buildReviewerPrompt({
  userPrompt,
  currentActivity,
  attachments,
  recentMessages,
  routerDecision,
  planner,
  operationResult,
}: SharedPromptOptions & {
  routerDecision: RouterDecision
  planner: OperationPlanner
  operationResult: unknown
}) {
  return `
Revise a operacao executada.

Pedido atual:
${userPrompt.trim()}

Decisao do roteador:
${JSON.stringify(routerDecision, null, 2)}

Plano:
${JSON.stringify(planner, null, 2)}

Resultado da operacao:
${JSON.stringify(operationResult, null, 2)}

Atividade atual:
${summarizeActivityForPrompt(currentActivity)}

Anexos:
${formatAttachmentSection(attachments)}

Historico recente:
${formatRecentMessages(recentMessages)}
`.trim()
}
