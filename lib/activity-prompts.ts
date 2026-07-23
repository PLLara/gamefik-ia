import { type SupportedLanguage } from "@/lib/i18n"

export type AttachmentDescriptor = {
  name: string
  mimeType: string
  size: number
}

type BuildActivityPromptOptions = {
  userPrompt: string
  attachments: AttachmentDescriptor[]
  language: SupportedLanguage
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

export function getActivityGenerationSystemInstruction(language: SupportedLanguage): string {
  const langInstruction = getLanguageInstruction(language)
  return `
Voce e um assistente especialista em criar atividades educacionais.

Objetivo:
- transformar o pedido do professor em uma atividade pronta para uso;
- escolher entre "quiz" e "missao" com base no pedido e no material anexado;
- responder apenas com JSON valido, sem markdown e sem texto fora do JSON;
- gerar conteudo pedagogico, claro, correto e adequado para sala de aula.

Regras obrigatorias:
- ${langInstruction}
- se o pedido indicar avaliacao objetiva, perguntas, revisao de conteudo ou multipla escolha, prefira "quiz";
- se o pedido indicar tarefa pratica, entrega, leitura, pesquisa, producao ou evidencia, prefira "missao";
- use exatamente o campo "type" com valor "quiz" ou "missao";
- o titulo deve ser curto e claro;
- a descricao deve explicar a atividade de forma objetiva;
- "teacherMessage" deve ser uma mensagem curta e amigavel, como se fosse o professor falando com o aluno;
- "attachmentContext" deve listar de 0 a 3 referencias curtas ao que foi aproveitado dos anexos, em frases muito breves;
- em quiz, use exatamente o campo "quizQuestions";
- em quiz, cada item de "quizQuestions" deve usar os campos "enunciado", "alternatives" e "points";
- em quiz, cada alternativa deve ser um objeto com os campos "text" e "correct";
- em quiz, crie entre 3 e 6 questoes relevantes, cada uma com exatamente uma alternativa correta;
- em quiz, varie o texto das alternativas e evite respostas ambiguas;
- em quiz, verifique se a alternativa marcada como correta esta cientificamente correta;
- em missao, escolha "missionProofType" e "missionValidation" coerentes com a tarefa proposta;
- nunca use nomes alternativos como "activityType", "questions", "questionText" ou "correctAlternative";
- nunca invente campos fora do schema.
`.trim()
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

export function buildActivityPrompt({
  userPrompt,
  attachments,
  language,
}: BuildActivityPromptOptions) {
  const normalizedPrompt = userPrompt.trim()

  const attachmentSection =
    attachments.length > 0
      ? attachments
          .map(
            (attachment, index) =>
              `${index + 1}. ${attachment.name} (${attachment.mimeType}, ${formatBytes(attachment.size)})`
          )
          .join("\n")
      : language === "en-US"
      ? "No attachments sent."
      : language === "es-ES"
      ? "No se enviaron adjuntos."
      : "Nenhum anexo enviado."

  const promptSection =
    normalizedPrompt.length > 0
      ? normalizedPrompt
      : language === "en-US"
      ? "No text was provided. Use only the context of the attachments to create the activity."
      : language === "es-ES"
      ? "No se proporciono texto. Use solo el contexto de los adjuntos para crear la actividad."
      : "Nao foi fornecido texto. Use apenas o contexto dos anexos para criar a atividade."

  const finalInstructions =
    language === "en-US"
      ? "- use attachments as a source of context whenever it makes sense;\n- if the request is vague, make sensible and pedagogical decisions;\n- keep the result ready for immediate use in a school app;\n- respond only with the final JSON."
      : language === "es-ES"
      ? "- use los adjuntos como fuente de contexto siempre que tenga sentido;\n- si la solicitud es vaga, tome decisiones sensatas y pedagogicas;\n- mantenga el resultado listo para uso inmediato en una app escolar;\n- responda solo con el JSON final."
      : "- use os anexos como fonte de contexto sempre que fizer sentido;\n- se o pedido estiver vago, tome decisoes sensatas e pedagogicas;\n- mantenha o resultado pronto para uso imediato em um app escolar;\n- responda apenas com o JSON final."

  return `
Crie uma atividade educacional completa seguindo o schema solicitado.

Pedido do professor:
${promptSection}

Anexos recebidos:
${attachmentSection}

Instrucoes finais:
${finalInstructions}
`.trim()
}
