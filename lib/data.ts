export interface Recompensa {
  id: string
  nome: string
  descricao?: string
  imagem: string
  valorMoedas: number
  quantidadeDisponivel: number
  limitePorAluno: number
  turmasIds: string[]
  ativo: boolean
  // Gift card specific fields
  status?: "rascunho" | "ativo"
  tipo?: "normal" | "giftcard"
  giftcardMarca?: string
  giftcardValor?: number
}

export interface Pedido {
  id: string
  alunoId: string
  alunoNome: string
  alunoAvatar: string
  turmaNome: string
  recompensaId: string
  recompensaNome: string
  recompensaImagem: string
  valorMoedas: number
  status: "pendente" | "aceito" | "entregue" | "cancelado"
  dataPedido: string
  dataAtualizacao?: string
}

export interface Turma {
  id: string
  nome: string
  sigla: string
  totalAlunos: number
}

export interface Aluno {
  id: string
  nome: string
  avatar: string
  turmaId: string
  turmaNome: string
  ativo: boolean
  moedas: number
  entradaEm: string
  genero: "M" | "F"
  engajamento: "Super engajado" | "Engajado" | "Pouco engajado"
}

const nomesAlunos = [
  "Kaua C. Pereira",
  "Fernanda R. Rodrigues",
  "Cauã M. Souza",
  "Lara S. Silva",
  "Paulo S. Araujo",
  "Vitória P. Lima",
  "Brenda G. Rodrigues",
  "Marina A. Cunha",
  "Gabriel T. Santos",
  "Isabela F. Oliveira",
  "Lucas M. Costa",
  "Ana B. Ferreira",
  "Rafael L. Almeida",
  "Julia C. Nascimento",
  "Pedro H. Carvalho",
  "Sophia R. Martins",
  "Matheus A. Ribeiro",
  "Valentina S. Souza",
  "Enzo G. Lima",
  "Helena P. Gomes",
  "Theo M. Barbosa",
  "Alice R. Rocha",
  "Miguel S. Dias",
  "Laura F. Cardoso",
  "Arthur T. Moreira",
  "Cecilia L. Nunes",
  "Heitor A. Teixeira",
  "Manuela B. Vieira",
  "Bernardo C. Pinto",
  "Maria E. Correa",
  "Davi S. Melo",
  "Lorena T. Azevedo",
  "Samuel R. Monteiro",
  "Beatriz P. Rezende",
  "Nicolas F. Campos",
  "Emanuelly G. Freitas",
  "Gustavo H. Macedo",
  "Livia M. Amorim",
  "Felipe L. Nogueira",
  "Isadora A. Mendes",
  "Daniel B. Cavalcanti",
  "Clara C. Barreto",
  "Leonardo S. Aguiar",
  "Camila R. Lopes",
  "Ryan T. Duarte",
  "Eloá F. Fonseca",
  "João P. Ramos",
  "Yasmin G. Castro",
  "Guilherme H. Andrade",
  "Nicole M. Moura",
]

const avatarSeeds = [
  "adventurer",
  "avataaars",
  "bottts",
  "fun-emoji",
  "lorelei",
  "micah",
  "miniavs",
  "notionists",
  "open-peeps",
  "personas",
  "pixel-art",
  "thumbs",
]

function gerarAvatar(seed: string): string {
  const style = avatarSeeds[Math.abs(hashCode(seed)) % avatarSeeds.length]
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}

export function gerarTurmas(): Turma[] {
  const turmas: Turma[] = []
  const nomes = [
    "Turma 1A", "Turma 1B", "Turma 1C",
    "Turma 2", "Turma 3", "Turma 4", "Turma 5",
    "Turma 6", "Turma 7", "Turma 8", "Turma 9",
    "Turma 10", "Turma 11", "Turma 12", "Turma 13",
    "Turma 14", "Turma 15", "Turma 16", "Turma 17",
    "Turma 18", "Turma 19", "Turma 20", "Turma 21",
    "Turma 22", "Turma 23", "Turma 24", "Turma 25",
    "Turma 26", "Turma 27", "Turma 28", "Turma 29",
  ]

  const siglas = [
    "T1A", "T1B", "T1C",
    "T2", "T3", "T4", "T5",
    "T6", "T7", "T8", "T9",
    "T10", "T11", "T12", "T13",
    "T14", "T15", "T16", "T17",
    "T18", "T19", "T20", "T21",
    "T22", "T23", "T24", "T25",
    "T26", "T27", "T28", "T29",
  ]

  for (let i = 0; i < nomes.length; i++) {
    turmas.push({
      id: `turma-${i + 1}`,
      nome: nomes[i],
      sigla: siglas[i],
      totalAlunos: 50,
    })
  }

  return turmas
}

const nomesFemininos = new Set([
  "Fernanda", "Lara", "Vitória", "Brenda", "Marina",
  "Isabela", "Ana", "Julia", "Sophia", "Valentina",
  "Helena", "Alice", "Laura", "Cecilia", "Manuela",
  "Maria", "Lorena", "Beatriz", "Emanuelly", "Livia",
  "Isadora", "Clara", "Camila", "Eloá", "Yasmin", "Nicole",
])

function getGenero(nome: string): "M" | "F" {
  const primeiro = nome.split(" ")[0]
  return nomesFemininos.has(primeiro) ? "F" : "M"
}

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export function gerarAlunos(turmaId: string, turmaNome: string): Aluno[] {
  const alunos: Aluno[] = []
  for (let i = 0; i < 50; i++) {
    const nome = nomesAlunos[i % nomesAlunos.length]
    const id = `${turmaId}-aluno-${i + 1}`
    const mesIdx = Math.abs(hashCode(id)) % 12
    const genero = getGenero(nome)
    const engajamentoOptions = ["Super engajado", "Engajado", "Pouco engajado"] as const
    const engajamento = engajamentoOptions[Math.abs(hashCode(id + "eng")) % 3]
    alunos.push({
      id,
      nome,
      avatar: gerarAvatar(`${turmaId}-${nome}-${i}`),
      turmaId,
      turmaNome,
      ativo: Math.abs(hashCode(id + "ativo")) % 100 > 15,
      moedas: Math.floor(Math.abs(hashCode(id + "moedas")) % 5000),
      entradaEm: `${meses[mesIdx]} de 2026`,
      genero,
      engajamento,
    })
  }
  return alunos
}

const recompensasBase = [
  { nome: "Adesivo Especial", descricao: "Adesivo colecionavel do Gamefik", valor: 50, limite: 5 },
  { nome: "Lapis Colorido", descricao: "Kit de lapis coloridos", valor: 100, limite: 2 },
  { nome: "Borracha Divertida", descricao: "Borracha com formato de emoji", valor: 30, limite: 10 },
  { nome: "Caderno Gamefik", descricao: "Caderno exclusivo com capa personalizada", valor: 200, limite: 1 },
  { nome: "Tempo Extra no Recreio", descricao: "5 minutos extras de recreio", valor: 150, limite: 3 },
  { nome: "Sentar no Lugar Favorito", descricao: "Escolher seu lugar na sala por uma semana", valor: 80, limite: 2 },
  { nome: "Ajudante do Professor", descricao: "Ser ajudante do professor por um dia", valor: 120, limite: 1 },
  { nome: "Lanche Especial", descricao: "Ganhar um lanche especial na cantina", valor: 180, limite: 2 },
  { nome: "Certificado de Destaque", descricao: "Certificado de aluno destaque do mes", valor: 300, limite: 1 },
  { nome: "Mascote de Pelucia", descricao: "Mini pelucia do mascote da escola", valor: 500, limite: 1 },
]

export function gerarRecompensas(): Recompensa[] {
  const turmas = gerarTurmas()
  return recompensasBase.map((r, i) => ({
    id: `recompensa-${i + 1}`,
    nome: r.nome,
    descricao: r.descricao,
    imagem: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(r.nome)}`,
    valorMoedas: r.valor,
    quantidadeDisponivel: Math.floor(Math.random() * 20) + 5,
    limitePorAluno: r.limite,
    turmasIds: turmas.slice(0, Math.floor(Math.random() * 5) + 3).map((t) => t.id),
    ativo: true,
  }))
}

const statusOptions: Pedido["status"][] = ["pendente", "aceito", "entregue", "cancelado"]

export function gerarPedidos(): Pedido[] {
  const recompensas = gerarRecompensas()
  const pedidos: Pedido[] = []
  
  for (let i = 0; i < 25; i++) {
    const recompensa = recompensas[i % recompensas.length]
    const alunoNome = nomesAlunos[i % nomesAlunos.length]
    const status = statusOptions[i % 4]
    const dia = 12 - Math.floor(i / 4)
    
    pedidos.push({
      id: `pedido-${i + 1}`,
      alunoId: `turma-1-aluno-${i + 1}`,
      alunoNome,
      alunoAvatar: gerarAvatar(`turma-1-${alunoNome}-${i}`),
      turmaNome: `Turma ${(i % 5) + 1}A`,
      recompensaId: recompensa.id,
      recompensaNome: recompensa.nome,
      recompensaImagem: recompensa.imagem,
      valorMoedas: recompensa.valorMoedas,
      status,
      dataPedido: `${dia.toString().padStart(2, "0")}/03/2026`,
      dataAtualizacao: status !== "pendente" ? `${dia.toString().padStart(2, "0")}/03/2026` : undefined,
    })
  }
  
  return pedidos
}
