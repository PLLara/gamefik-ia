import type { Activity } from "@/lib/activity-schema"
import type { AttachmentDescriptor } from "@/lib/activity-prompts"
import type { OperationPlanner, RouterDecision } from "@/lib/activity-operation-schema"
import { getStrings, type SupportedLanguage } from "@/lib/i18n"

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

function formatAttachmentSection(attachments: AttachmentDescriptor[], language: SupportedLanguage) {
  if (attachments.length === 0) {
    return getStrings(language).buildUserMessage.multipleAttachments(0).replace("0 ", "")
  }

  return attachments
    .map(
      (attachment, index) =>
        `${index + 1}. ${attachment.name} (${attachment.mimeType}, ${formatBytes(attachment.size)})`
    )
    .join("\n")
}

function formatRecentMessages(
  recentMessages: Array<{ role: "user" | "ai"; content: string }> | undefined,
  language: SupportedLanguage
) {
  if (!recentMessages || recentMessages.length === 0) {
    return language === "en-US" ? "No additional history." : language === "es-ES" ? "No hay historial adicional." : "Nenhum historico adicional."
  }

  const userLabel = language === "en-US" ? "User" : language === "es-ES" ? "Usuario" : "Usuario"
  const assistantLabel = language === "en-US" ? "Assistant" : language === "es-ES" ? "Asistente" : "Assistente"

  return recentMessages
    .slice(-6)
    .map(
      (message, index) =>
        `${index + 1}. ${message.role === "user" ? userLabel : assistantLabel}: ${message.content}`
    )
    .join("\n")
}

export function summarizeActivityForPrompt(activity: Activity | null, language: SupportedLanguage) {
  if (!activity) {
    return language === "en-US"
      ? "No current activity. The user wants to create something new."
      : language === "es-ES"
      ? "Ninguna actividad actual. El usuario quiere crear algo nuevo."
      : "Nenhuma atividade atual. O usuario quer criar algo novo."
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

function getLanguageInstruction(language: SupportedLanguage): string {
  switch (language) {
    case "en-US":
      return "Always respond in English (US)."
    case "es-ES":
      return "Siempre responda en espanol."
    case "pt-BR":
    default:
      return "Sempre responda em portugues do Brasil."
  }
}

export function getRouterSystemInstruction(language: SupportedLanguage): string {
  const langInstruction = getLanguageInstruction(language)
  return `
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
- se for uma atividade nova sem anexo e sem atividade atual, e o pedido trouxer apenas um tema amplo de conhecimento geral, voce pode seguir com geracao normal;
- use "ask_clarification" principalmente quando o pedido depender de fonte especifica, produto/modelo, documento, arquivo, contexto proprietario ou fatos muito particulares que nao possam ser inferidos com seguranca de conhecimento geral;
- nunca assuma fatos, especificacoes, funcionalidades, caracteristicas de produto ou contexto tecnico que nao estejam no pedido, no historico, na atividade atual ou nos anexos;
- ${langInstruction}
- responda apenas em JSON valido seguindo o schema.
`.trim()
}

export function buildRouterPrompt({
  userPrompt,
  currentActivity,
  attachments,
  recentMessages,
}: SharedPromptOptions, language: SupportedLanguage) {
  return `
Analise o pedido do usuario e escolha a operacao correta.

Pedido atual:
${userPrompt.trim()}

Atividade atual:
${summarizeActivityForPrompt(currentActivity, language)}

Anexos:
${formatAttachmentSection(attachments, language)}

Historico recente:
${formatRecentMessages(recentMessages, language)}
`.trim()
}

export function getPlannerSystemInstruction(language: SupportedLanguage): string {
  const langInstruction = getLanguageInstruction(language)
  return `
Voce e um planejador de operacoes para um editor de atividades educacionais.

Sua funcao e detalhar o que precisa ser produzido para executar a acao escolhida.

Regras:
- nao gere a atividade final;
- descreva o escopo da alteracao de forma objetiva;
- informe quantidade de questoes a adicionar quando fizer sentido;
- identifique alvo de questao quando fizer sentido;
- informe os campos que precisam ser atualizados;
- nao amplie o escopo com fatos novos que nao estejam ancorados no pedido, no historico, na atividade atual ou nos anexos;
- ${langInstruction}
- responda apenas em JSON valido seguindo o schema.
`.trim()
}

export function buildPlannerPrompt({
  userPrompt,
  currentActivity,
  attachments,
  recentMessages,
  routerDecision,
}: SharedPromptOptions & {
  routerDecision: RouterDecision
}, language: SupportedLanguage) {
  return `
Planeje a execucao da operacao escolhida.

Pedido atual:
${userPrompt.trim()}

Decisao do roteador:
${JSON.stringify(routerDecision, null, 2)}

Atividade atual:
${summarizeActivityForPrompt(currentActivity, language)}

Anexos:
${formatAttachmentSection(attachments, language)}

Historico recente:
${formatRecentMessages(recentMessages, language)}
`.trim()
}

export function getExecutorSystemInstruction(language: SupportedLanguage): string {
  const langInstruction = getLanguageInstruction(language)
  return `
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
- ${langInstruction}
- para temas educacionais amplos e comuns, voce pode gerar com base em conhecimento geral mesmo sem anexos;
- baseie cada afirmacao apenas no pedido, no historico, na atividade atual e nos anexos;
- nao invente especificacoes, funcionalidades, contexto tecnico, nomes proprios ou detalhes factuais ausentes das entradas fornecidas para produtos, documentos especificos ou temas proprietarios;
- responda apenas em JSON valido seguindo o schema.
`.trim()
}

export function getExecutorSchemaDescription(action: string, language: SupportedLanguage) {
  const isEn = language === "en-US"
  const isEs = language === "es-ES"

  switch (action) {
    case "full_regeneration":
      return isEn
        ? `Expected schema (JSON):
{"action":"full_regeneration","payload":{"activity":{"type":"quiz" or "missao","title":"string","description":"string","teacherMessage":"string","attachmentContext":["string"],"quizQuestions":[{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}],"missionProofType":"foto|video|texto|arquivo","missionValidation":"ia|manual|auto"}}}
Rules: if type is "quiz", include quizQuestions with at least 1 question and 2 alternatives. If type is "missao", include missionProofType and missionValidation.`
        : isEs
        ? `Esquema esperado (JSON):
{"action":"full_regeneration","payload":{"activity":{"type":"quiz" o "missao","title":"string","description":"string","teacherMessage":"string","attachmentContext":["string"],"quizQuestions":[{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}],"missionProofType":"foto|video|texto|arquivo","missionValidation":"ia|manual|auto"}}}
Reglas: si type es "quiz", incluya quizQuestions con al menos 1 pregunta y 2 alternativas. Si type es "missao", incluya missionProofType y missionValidation.`
        : `Schema esperado (JSON):
{"action":"full_regeneration","payload":{"activity":{"type":"quiz" ou "missao","title":"string","description":"string","teacherMessage":"string","attachmentContext":["string"],"quizQuestions":[{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}],"missionProofType":"foto|video|texto|arquivo","missionValidation":"ia|manual|auto"}}}
Regras: se type for "quiz", inclua quizQuestions com pelo menos 1 questao e 2 alternativas. Se type for "missao", inclua missionProofType e missionValidation.`
    case "update_metadata":
      return isEn
        ? `Expected schema (JSON):
{"action":"update_metadata","payload":{"title":"string"(optional),"description":"string"(optional),"teacherMessage":"string"(optional)}}`
        : isEs
        ? `Esquema esperado (JSON):
{"action":"update_metadata","payload":{"title":"string"(opcional),"description":"string"(opcional),"teacherMessage":"string"(opcional)}}`
        : `Schema esperado (JSON):
{"action":"update_metadata","payload":{"title":"string"(opcional),"description":"string"(opcional),"teacherMessage":"string"(opcional)}}`
    case "append_questions":
      return isEn
        ? `Expected schema (JSON):
{"action":"append_questions","payload":{"questions":[{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}]}}`
        : isEs
        ? `Esquema esperado (JSON):
{"action":"append_questions","payload":{"questions":[{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}]}}`
        : `Schema esperado (JSON):
{"action":"append_questions","payload":{"questions":[{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}]}}`
    case "replace_question":
      return isEn
        ? `Expected schema (JSON):
{"action":"replace_question","payload":{"questionId":"string","question":{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}}}`
        : isEs
        ? `Esquema esperado (JSON):
{"action":"replace_question","payload":{"questionId":"string","question":{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}}}`
        : `Schema esperado (JSON):
{"action":"replace_question","payload":{"questionId":"string","question":{"enunciado":"string","points":number,"alternatives":[{"text":"string","correct":boolean}]}}}`
    case "mission_adjustment":
      return isEn
        ? `Expected schema (JSON):
{"action":"mission_adjustment","payload":{"title":"string"(optional),"description":"string"(optional),"teacherMessage":"string"(optional),"missionProofType":"foto|video|texto|arquivo"(optional),"missionValidation":"ia|manual|auto"(optional)}}`
        : isEs
        ? `Esquema esperado (JSON):
{"action":"mission_adjustment","payload":{"title":"string"(opcional),"description":"string"(opcional),"teacherMessage":"string"(opcional),"missionProofType":"foto|video|texto|arquivo"(opcional),"missionValidation":"ia|manual|auto"(opcional)}}`
        : `Schema esperado (JSON):
{"action":"mission_adjustment","payload":{"title":"string"(opcional),"description":"string"(opcional),"teacherMessage":"string"(opcional),"missionProofType":"foto|video|texto|arquivo"(opcional),"missionValidation":"ia|manual|auto"(opcional)}}`
    case "remove_question":
      return isEn
        ? `Expected schema (JSON):
{"action":"remove_question","payload":{"questionId":"string"}}`
        : isEs
        ? `Esquema esperado (JSON):
{"action":"remove_question","payload":{"questionId":"string"}}`
        : `Schema esperado (JSON):
{"action":"remove_question","payload":{"questionId":"string"}}`
    case "ask_clarification":
      return isEn
        ? `Expected schema (JSON):
{"action":"ask_clarification","payload":{"question":"string"}}`
        : isEs
        ? `Esquema esperado (JSON):
{"action":"ask_clarification","payload":{"question":"string"}}`
        : `Schema esperado (JSON):
{"action":"ask_clarification","payload":{"question":"string"}}`
    default:
      return ""
  }
}

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
}, language: SupportedLanguage) {
  return `
Execute a operacao planejada.

Pedido atual:
${userPrompt.trim()}

Decisao do roteador:
${JSON.stringify(routerDecision, null, 2)}

Plano:
${JSON.stringify(planner, null, 2)}

Atividade atual:
${summarizeActivityForPrompt(currentActivity, language)}

Anexos:
${formatAttachmentSection(attachments, language)}

Historico recente:
${formatRecentMessages(recentMessages, language)}

${getExecutorSchemaDescription(planner.action, language)}
`.trim()
}

export function getReviewerSystemInstruction(language: SupportedLanguage): string {
  const langInstruction = getLanguageInstruction(language)
  return `
Voce e o revisor final de uma operacao de edicao de atividade.

Sua funcao e dizer se a operacao executada atende ao pedido do usuario.

Regras:
- aprove se a operacao cumpre exatamente o pedido;
- rejeite se a operacao for ampla demais, estreita demais, ou semanticamente errada;
- prefira operacoes parciais quando o pedido for parcial;
- "append_questions" nao pode recriar o quiz inteiro;
- "update_metadata" nao pode reescrever questoes;
- rejeite quando a operacao inventar fatos, especificacoes de produto ou contexto nao sustentado pelo pedido, pela atividade atual, pelo historico ou pelos anexos;
- se a solicitacao for uma atividade nova sobre tema amplo de conhecimento geral, nao reprove so por falta de anexo;
- se a solicitacao depender de produto/modelo/documento/contexto especifico e faltarem dados, prefira reprovacao com feedback pedindo "ask_clarification" em vez de aprovar conteudo especulativo;
- ${langInstruction}
- responda apenas em JSON valido.
`.trim()
}

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
}, language: SupportedLanguage) {
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
${summarizeActivityForPrompt(currentActivity, language)}

Anexos:
${formatAttachmentSection(attachments, language)}

Historico recente:
${formatRecentMessages(recentMessages, language)}
`.trim()
}
