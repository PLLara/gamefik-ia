export type SupportedLanguage = "pt-BR" | "en-US" | "es-ES"

export const DEFAULT_LANGUAGE: SupportedLanguage = "pt-BR"

export function detectLanguageFromPrompt(prompt: string): SupportedLanguage {
  const trimmed = prompt.trim()

  // Explicit language tags take highest priority
  if (/\[Idioma:\s*en-US\]/i.test(trimmed)) return "en-US"
  if (/\[Idioma:\s*es-ES\]/i.test(trimmed)) return "es-ES"
  if (/\[Idioma:\s*pt-BR\]/i.test(trimmed)) return "pt-BR"

  // Detect by checking if the prompt is predominantly English or Spanish
  const lower = trimmed.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)

  // Common English words indicator
  const englishIndicators = [
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "are", "was", "were", "be",
    "been", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "this", "that", "these",
    "those", "i", "you", "he", "she", "it", "we", "they", "my", "your",
    "his", "her", "its", "our", "their", "what", "which", "who", "when",
    "where", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "not", "only", "own", "same",
    "so", "than", "too", "very", "just", "now", "then", "here", "there",
    "up", "down", "out", "off", "over", "under", "again", "further",
    "once", "about", "into", "through", "during", "before", "after",
    "above", "below", "between", "among", "want", "need", "like", "make",
    "get", "know", "think", "take", "see", "come", "want", "use", "find",
    "give", "tell", "ask", "work", "seem", "feel", "try", "leave", "call",
    "good", "new", "first", "last", "long", "great", "little", "own",
    "other", "old", "right", "big", "high", "different", "small", "large",
    "next", "early", "young", "important", "few", "public", "bad", "same",
    "able", "quiz", "question", "activity", "create", "generate", "today",
    "feeling", "feel", "one", "two", "three", "four", "five", "how", "me",
  ]

  // Common Spanish words indicator
  const spanishIndicators = [
    "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o",
    "pero", "en", "de", "a", "por", "para", "con", "sin", "sobre",
    "entre", "desde", "hasta", "durante", "según", "mediante", "excepto",
    "salvo", "como", "más", "menos", "muy", "mucho", "mucha", "muchos",
    "muchas", "poco", "poca", "pocos", "pocas", "todo", "toda", "todos",
    "todas", "cada", "cualquier", "alguno", "alguna", "algunos", "algunas",
    "ninguno", "ninguna", "otro", "otra", "otros", "otras", "mismo",
    "misma", "mismos", "mismas", "tal", "tales", "cierto", "cierta",
    "ciertos", "ciertas", "varios", "varias", "tanto", "tanta", "tantos",
    "tantas", "ser", "estar", "tener", "haber", "hacer", "poder", "decir",
    "ir", "ver", "dar", "saber", "querer", "llegar", "pasar", "deber",
    "poner", "parecer", "quedar", "llevar", "encontrar", "seguir",
    "cambiar", "hablar", "creer", "empezar", "volver", "sentir", "tratar",
    "mirar", "contar", "empezar", "esperar", "buscar", "existir", "entrar",
    "trabajar", "escribir", "perder", "producir", "ocurrir", "comprender",
    "quizz", "pregunta", "actividad", "crear", "generar", "hoy", "sentir",
    "me", "uno", "dos", "tres", "cuatro", "cinco", "cómo", "qué",
  ]

  let englishScore = 0
  let spanishScore = 0

  for (const word of words) {
    if (englishIndicators.includes(word)) englishScore++
    if (spanishIndicators.includes(word)) spanishScore++
  }

  // Need at least 2 indicator words to make a determination
  if (englishScore >= 2 && englishScore > spanishScore) return "en-US"
  if (spanishScore >= 2 && spanishScore > englishScore) return "es-ES"

  // Fall back to browser locale
  return detectBrowserLanguage()
}

export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE

  const lang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || ""

  if (lang.startsWith("en")) return "en-US"
  if (lang.startsWith("es")) return "es-ES"
  if (lang.startsWith("pt")) return "pt-BR"

  return DEFAULT_LANGUAGE
}

export function stripLanguageTag(prompt: string): string {
  return prompt.replace(/\[Idioma:\s*[^\]]+\]/i, "").trim()
}

type I18nStrings = {
  welcomeMessage: string
  generatingActivity: string
  activityGeneratedSuccess: string
  emptyPromptError: string
  tooManyAttachmentsError: (max: number) => string
  unsupportedFileError: (name: string) => string
  fileTooLargeError: (name: string) => string
  totalAttachmentsTooLargeError: string
  clarificationDefault: string
  assistantMessage: {
    appendQuestions: (count: number) => string
    updateMetadata: string
    replaceQuestion: string
    missionAdjustment: string
    removeQuestion: string
    fullRegeneration: string
  }
  userFacingErrors: {
    tooManyQuestions: {
      title: string
      description: string
      suggestion: string
    }
    missingApiKey: {
      title: string
      description: string
      suggestion: string
    }
    invalidJson: {
      title: string
      description: string
      suggestion: string
    }
    unsupportedFormat: {
      title: string
      description: string
      suggestion: string
    }
    fileTooLarge: {
      title: string
      description: string
      suggestion: string
    }
    missingContext: {
      title: string
      description: string
      suggestion: string
    }
    generationFailed: {
      title: string
      description: string
      suggestion: string
    }
    defaultError: {
      title: string
      description: string
      suggestion?: string
    }
  }
  routerPhaseMessages: {
    analyzing: string
    clarificationNeeded: string
    actionChosen: (action: string) => string
  }
  executorPhaseMessages: {
    executing: string
    refining: (attempt: number) => string
  }
  reviewerPhaseMessage: string
  patchPhaseMessage: string
  preRoutingClarification: {
    emptyPrompt: string
    bareTopic: (topic: string) => string
  }
  buildUserMessage: {
    singleAttachment: (name: string) => string
    multipleAttachments: (count: number) => string
  }
  buildClarificationFollowUp: {
    header: string
    originalPrompt: string
    clarificationQuestion: string
    userResponse: string
    footer: string
  }
  debugMessages: {
    noLogsYet: string
  }
  modelDisplayNames: {
    fallback: string
    primary: string
    generic: string
  }
  toastMessages: {
    success: string
    error: string
  }
}

const ptStrings: I18nStrings = {
  welcomeMessage:
    "Ola! Descreva a atividade que voce quer criar ou envie materiais em PDF/imagem. Eu gero um quiz ou uma missao completos para voce.",
  generatingActivity: "Gerando atividade com a IA...",
  activityGeneratedSuccess: "Atividade gerada com sucesso.",
  emptyPromptError: "Descreva a atividade ou envie ao menos um anexo.",
  tooManyAttachmentsError: (max) => `Envie no maximo ${max} anexos por vez.`,
  unsupportedFileError: (name) => `O arquivo "${name}" nao e suportado.`,
  fileTooLargeError: (name) => `O arquivo "${name}" excede o limite de 8 MB.`,
  totalAttachmentsTooLargeError: "O total de anexos excede o limite de 14 MB por solicitacao.",
  clarificationDefault: "Preciso de mais detalhes para continuar.",
  assistantMessage: {
    appendQuestions: (count) =>
      `Adicionei ${count} questoes novas ao quiz sem recriar o restante.`,
    updateMetadata: "Atualizei os metadados pedidos sem recriar a atividade inteira.",
    replaceQuestion: "Atualizei a questao solicitada sem alterar o restante do quiz.",
    missionAdjustment: "Ajustei a missao de forma localizada, preservando o restante da atividade.",
    removeQuestion: "Removi a questao solicitada e preservei o restante do quiz.",
    fullRegeneration: "Atividade gerada com sucesso.",
  },
  userFacingErrors: {
    tooManyQuestions: {
      title: "Quantidade de questoes acima do permitido",
      description:
        "Esse pedido ultrapassou o limite atual de questoes que a interface consegue organizar de uma vez.",
      suggestion:
        "Tente pedir um numero menor de questoes agora ou divida em dois pedidos, por exemplo: 'gere 10 agora' e depois 'adicione mais 10'.",
    },
    missingApiKey: {
      title: "Configuracao da IA ausente",
      description: "A chave da IA nao esta configurada corretamente neste ambiente.",
      suggestion: "Verifique a configuracao da chave da IA e tente novamente.",
    },
    invalidJson: {
      title: "Resposta da IA veio em formato inesperado",
      description: "A resposta recebida nao pode ser interpretada com seguranca.",
      suggestion: "Tente novamente com um pedido mais especifico.",
    },
    unsupportedFormat: {
      title: "Formato de arquivo nao suportado",
      description: "No momento, a interface aceita apenas imagens e arquivos PDF como anexo.",
      suggestion: "Envie um PDF ou uma imagem e tente novamente.",
    },
    fileTooLarge: {
      title: "Arquivo muito grande",
      description: "Um dos anexos ultrapassou o tamanho maximo permitido.",
      suggestion: "Reduza o arquivo para menos de 8 MB e tente novamente.",
    },
    missingContext: {
      title: "Faltou contexto para gerar a atividade",
      description: "Nenhum texto nem anexo foi enviado para a IA trabalhar.",
      suggestion: "Descreva a atividade desejada ou envie um material de apoio.",
    },
    generationFailed: {
      title: "A IA nao conseguiu concluir esse pedido",
      description:
        "O sistema tentou refinar a resposta, mas nao chegou a uma operacao segura para aplicar.",
      suggestion: "Reformule o pedido com mais clareza e tente novamente.",
    },
    defaultError: {
      title: "Nao foi possivel concluir sua solicitacao",
      description: "Aconteceu um problema durante a geracao ou edicao da atividade.",
      suggestion: "Tente novamente em instantes ou reformule o pedido.",
    },
  },
  routerPhaseMessages: {
    analyzing: "Analisando a intencao do pedido...",
    clarificationNeeded: "Pedido sem base suficiente; solicitando esclarecimento antes de gerar.",
    actionChosen: (action) => `Acao escolhida: ${action}.`,
  },
  executorPhaseMessages: {
    executing: "Executando a operacao pedida...",
    refining: (attempt) => `Refinando a execucao (${attempt})...`,
  },
  reviewerPhaseMessage: "Revisando se a operacao realmente cumpre o pedido...",
  patchPhaseMessage: "Aplicando patch na atividade atual...",
  preRoutingClarification: {
    emptyPrompt:
      "Pode me dizer qual conteudo voce quer cobrar na atividade ou enviar um PDF/imagem de referencia?",
    bareTopic: (topic) =>
      `Antes de montar a atividade sobre "${topic}", preciso de uma base melhor para nao inventar conteudo. Envie um PDF/imagem ou descreva os topicos, fatos e recorte que devem ser cobrados.`,
  },
  buildUserMessage: {
    singleAttachment: (name) => `Gerar atividade a partir do anexo "${name}".`,
    multipleAttachments: (count) => `Gerar atividade usando ${count} anexos enviados.`,
  },
  buildClarificationFollowUp: {
    header: "Continuacao da mesma solicitacao anterior.",
    originalPrompt: "Pedido original do usuario:",
    clarificationQuestion: "Pergunta de esclarecimento feita pela IA:",
    userResponse: "Resposta atual do usuario:",
    footer:
      "Trate a resposta atual como complemento do pedido original, nao como uma nova solicitacao isolada.",
  },
  debugMessages: {
    noLogsYet:
      "Ainda nao ha logs. Gere uma atividade para popular este painel.",
  },
  modelDisplayNames: {
    fallback: "modelo de reserva",
    primary: "modelo principal",
    generic: "modelo de IA",
  },
  toastMessages: {
    success: "Atividade gerada com sucesso.",
    error: "Erro ao gerar atividade",
  },
}

const enStrings: I18nStrings = {
  welcomeMessage:
    "Hi! Describe the activity you want to create or upload materials in PDF/image format. I'll generate a complete quiz or mission for you.",
  generatingActivity: "Generating activity with AI...",
  activityGeneratedSuccess: "Activity generated successfully.",
  emptyPromptError: "Describe the activity or send at least one attachment.",
  tooManyAttachmentsError: (max) => `Send at most ${max} attachments at a time.`,
  unsupportedFileError: (name) => `The file "${name}" is not supported.`,
  fileTooLargeError: (name) => `The file "${name}" exceeds the 8 MB limit.`,
  totalAttachmentsTooLargeError: "The total attachments exceed the 14 MB limit per request.",
  clarificationDefault: "I need more details to continue.",
  assistantMessage: {
    appendQuestions: (count) =>
      `I added ${count} new questions to the quiz without recreating the rest.`,
    updateMetadata: "I updated the requested metadata without recreating the entire activity.",
    replaceQuestion: "I updated the requested question without changing the rest of the quiz.",
    missionAdjustment: "I adjusted the mission in a localized way, preserving the rest of the activity.",
    removeQuestion: "I removed the requested question and preserved the rest of the quiz.",
    fullRegeneration: "Activity generated successfully.",
  },
  userFacingErrors: {
    tooManyQuestions: {
      title: "Number of questions above the limit",
      description:
        "This request exceeded the current limit of questions the interface can organize at once.",
      suggestion:
        "Try asking for a smaller number of questions now or split into two requests, for example: 'generate 10 now' and then 'add 10 more'.",
    },
    missingApiKey: {
      title: "AI configuration missing",
      description: "The AI key is not configured correctly in this environment.",
      suggestion: "Check the AI key configuration and try again.",
    },
    invalidJson: {
      title: "AI response came in an unexpected format",
      description: "The received response could not be safely interpreted.",
      suggestion: "Try again with a more specific request.",
    },
    unsupportedFormat: {
      title: "Unsupported file format",
      description: "Currently, the interface only accepts images and PDF files as attachments.",
      suggestion: "Send a PDF or an image and try again.",
    },
    fileTooLarge: {
      title: "File too large",
      description: "One of the attachments exceeded the maximum allowed size.",
      suggestion: "Reduce the file to less than 8 MB and try again.",
    },
    missingContext: {
      title: "Missing context to generate the activity",
      description: "No text or attachment was sent for the AI to work with.",
      suggestion: "Describe the desired activity or send supporting material.",
    },
    generationFailed: {
      title: "The AI could not complete this request",
      description:
        "The system tried to refine the response but did not reach a safe operation to apply.",
      suggestion: "Rephrase the request more clearly and try again.",
    },
    defaultError: {
      title: "Could not complete your request",
      description: "A problem occurred during the generation or editing of the activity.",
      suggestion: "Try again in a moment or rephrase the request.",
    },
  },
  routerPhaseMessages: {
    analyzing: "Analyzing the intent of the request...",
    clarificationNeeded: "Request lacks sufficient basis; asking for clarification before generating.",
    actionChosen: (action) => `Chosen action: ${action}.`,
  },
  executorPhaseMessages: {
    executing: "Executing the requested operation...",
    refining: (attempt) => `Refining execution (${attempt})...`,
  },
  reviewerPhaseMessage: "Reviewing whether the operation really fulfills the request...",
  patchPhaseMessage: "Applying patch to the current activity...",
  preRoutingClarification: {
    emptyPrompt:
      "Can you tell me what content you want to cover in the activity or send a PDF/image for reference?",
    bareTopic: (topic) =>
      `Before creating the activity about "${topic}", I need a better basis so I don't invent content. Send a PDF/image or describe the topics, facts, and scope that should be covered.`,
  },
  buildUserMessage: {
    singleAttachment: (name) => `Generate activity from the attachment "${name}".`,
    multipleAttachments: (count) => `Generate activity using ${count} sent attachments.`,
  },
  buildClarificationFollowUp: {
    header: "Continuation of the same previous request.",
    originalPrompt: "User's original request:",
    clarificationQuestion: "Clarification question asked by the AI:",
    userResponse: "User's current response:",
    footer:
      "Treat the current response as a complement to the original request, not as a new isolated request.",
  },
  debugMessages: {
    noLogsYet: "No logs yet. Generate an activity to populate this panel.",
  },
  modelDisplayNames: {
    fallback: "fallback model",
    primary: "primary model",
    generic: "AI model",
  },
  toastMessages: {
    success: "Activity generated successfully.",
    error: "Error generating activity",
  },
}

const esStrings: I18nStrings = {
  welcomeMessage:
    "¡Hola! Describe la actividad que quieres crear o envia materiales en formato PDF/imagen. Genero un cuestionario o una mision completos para ti.",
  generatingActivity: "Generando actividad con IA...",
  activityGeneratedSuccess: "Actividad generada con exito.",
  emptyPromptError: "Describe la actividad o envia al menos un adjunto.",
  tooManyAttachmentsError: (max) => `Envia como maximo ${max} adjuntos a la vez.`,
  unsupportedFileError: (name) => `El archivo "${name}" no es compatible.`,
  fileTooLargeError: (name) => `El archivo "${name}" excede el limite de 8 MB.`,
  totalAttachmentsTooLargeError: "El total de adjuntos excede el limite de 14 MB por solicitud.",
  clarificationDefault: "Necesito mas detalles para continuar.",
  assistantMessage: {
    appendQuestions: (count) =>
      `Agregue ${count} preguntas nuevas al cuestionario sin recrear el resto.`,
    updateMetadata: "Actualice los metadatos solicitados sin recrear toda la actividad.",
    replaceQuestion: "Actualice la pregunta solicitada sin cambiar el resto del cuestionario.",
    missionAdjustment: "Ajuste la mision de forma localizada, preservando el resto de la actividad.",
    removeQuestion: "Elimine la pregunta solicitada y preserve el resto del cuestionario.",
    fullRegeneration: "Actividad generada con exito.",
  },
  userFacingErrors: {
    tooManyQuestions: {
      title: "Cantidad de preguntas por encima del permitido",
      description:
        "Esta solicitud supero el limite actual de preguntas que la interfaz puede organizar a la vez.",
      suggestion:
        "Intenta pedir un numero menor de preguntas ahora o divide en dos solicitudes, por ejemplo: 'genera 10 ahora' y luego 'agrega 10 mas'.",
    },
    missingApiKey: {
      title: "Configuracion de IA ausente",
      description: "La clave de IA no esta configurada correctamente en este entorno.",
      suggestion: "Verifica la configuracion de la clave de IA e intenta de nuevo.",
    },
    invalidJson: {
      title: "La respuesta de la IA vino en un formato inesperado",
      description: "La respuesta recibida no pudo ser interpretada con seguranca.",
      suggestion: "Intenta de nuevo con una solicitud mas especifica.",
    },
    unsupportedFormat: {
      title: "Formato de archivo no compatible",
      description: "Actualmente, la interfaz solo acepta imagenes y archivos PDF como adjuntos.",
      suggestion: "Envia un PDF o una imagen e intenta de nuevo.",
    },
    fileTooLarge: {
      title: "Archivo demasiado grande",
      description: "Uno de los adjuntos supero el tamano maximo permitido.",
      suggestion: "Reduce el archivo a menos de 8 MB e intenta de nuevo.",
    },
    missingContext: {
      title: "Falta contexto para generar la actividad",
      description: "No se envio texto ni adjunto para que la IA trabaje.",
      suggestion: "Describe la actividad deseada o envia material de apoyo.",
    },
    generationFailed: {
      title: "La IA no pudo completar esta solicitud",
      description:
        "El sistema intento refinar la respuesta pero no llego a una operacion segura para aplicar.",
      suggestion: "Reformula la solicitud con mas claridad e intenta de nuevo.",
    },
    defaultError: {
      title: "No se pudo completar tu solicitud",
      description: "Ocurrio un problema durante la generacion o edicion de la actividad.",
      suggestion: "Intenta de nuevo en un momento o reformula la solicitud.",
    },
  },
  routerPhaseMessages: {
    analyzing: "Analizando la intencion de la solicitud...",
    clarificationNeeded: "La solicitud carece de base suficiente; pidiendo aclaracion antes de generar.",
    actionChosen: (action) => `Accion elegida: ${action}.`,
  },
  executorPhaseMessages: {
    executing: "Ejecutando la operacion solicitada...",
    refining: (attempt) => `Refinando la ejecucion (${attempt})...`,
  },
  reviewerPhaseMessage: "Revisando si la operacion realmente cumple con la solicitud...",
  patchPhaseMessage: "Aplicando parche a la actividad actual...",
  preRoutingClarification: {
    emptyPrompt:
      "¿Puedes decirme que contenido quieres cubrir en la actividad o enviar un PDF/imagen de referencia?",
    bareTopic: (topic) =>
      `Antes de crear la actividad sobre "${topic}", necesito una mejor base para no inventar contenido. Envie un PDF/imagen o describa los temas, hechos y alcance que deben cubrirse.`,
  },
  buildUserMessage: {
    singleAttachment: (name) => `Generar actividad a partir del adjunto "${name}".`,
    multipleAttachments: (count) => `Generar actividad usando ${count} adjuntos enviados.`,
  },
  buildClarificationFollowUp: {
    header: "Continuacion de la misma solicitud anterior.",
    originalPrompt: "Solicitud original del usuario:",
    clarificationQuestion: "Pregunta de aclaracion hecha por la IA:",
    userResponse: "Respuesta actual del usuario:",
    footer:
      "Trata la respuesta actual como complemento de la solicitud original, no como una nueva solicitud aislada.",
  },
  debugMessages: {
    noLogsYet: "Aun no hay registros. Genera una actividad para poblar este panel.",
  },
  modelDisplayNames: {
    fallback: "modelo de reserva",
    primary: "modelo principal",
    generic: "modelo de IA",
  },
  toastMessages: {
    success: "Actividad generada con exito.",
    error: "Error al generar actividad",
  },
}

const stringsMap: Record<SupportedLanguage, I18nStrings> = {
  "pt-BR": ptStrings,
  "en-US": enStrings,
  "es-ES": esStrings,
}

export function getStrings(language: SupportedLanguage): I18nStrings {
  return stringsMap[language] ?? ptStrings
}
