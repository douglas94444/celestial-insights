import type { SignName } from "@/lib/astrology/zodiac";

export type ShareCardDailyColor = { labelPt: string; hex: string };

/** Hash determinístico FNV-1a (32-bit) para índice estável por string. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  return hash32(seed) % modulo;
}

export type TransitLuckFingerprintSource = {
  date: string;
  transitMoonSign: string;
  intensity: number;
};

/** Segundo segmento de seed: Lua em trânsito + bucket de intensidade (estável durante o dia civil). */
export function buildTransitLuckFingerprint(
  transit: TransitLuckFingerprintSource | null | undefined,
): string | undefined {
  if (!transit?.date) return undefined;
  const bucket = Math.floor(Math.min(100, Math.max(0, transit.intensity)) / 25);
  return `${transit.date}|${transit.transitMoonSign}|${bucket}`;
}

/** Índice da sorte: Sol + data + opcional fingerprint de trânsitos (mesmo resultado intra-dia). */
export function pickShareCardDailyLuck(
  sign: SignName,
  dateStr: string,
  transitFingerprint?: string,
): string {
  const list = LUCK_BY_SIGN[sign];
  const seed = transitFingerprint
    ? `${sign}|${dateStr}|${transitFingerprint}|luck`
    : `${sign}|${dateStr}|luck`;
  const idx = pickIndex(seed, list.length);
  return list[idx];
}

/** Índice da cor: salt distinto da sorte para variar combinações. */
export function pickShareCardDailyColor(sign: SignName, dateStr: string): ShareCardDailyColor {
  const pool = COLOR_POOL_BY_SIGN[sign];
  const idx = pickIndex(`${sign}|${dateStr}|color`, pool.length);
  return pool[idx];
}

export function buildShareCardDailyExtras(
  sunSign: SignName | null | undefined,
  todayStr: string,
  transitFingerprint?: string,
): { luckLine: string; colorLabel: string; colorHex: string } | null {
  if (!sunSign) return null;
  const color = pickShareCardDailyColor(sunSign, todayStr);
  return {
    luckLine: pickShareCardDailyLuck(sunSign, todayStr, transitFingerprint),
    colorLabel: color.labelPt,
    colorHex: color.hex,
  };
}

/** Micro-frases reflexivas (não preditivas); N ≥ 14 por signo. */
export const LUCK_BY_SIGN: Record<SignName, readonly string[]> = {
  Áries: [
    "Impulso gentil abre portas — escolha uma ação pequena e conclua.",
    "Sua coragem brilha quando ouve antes de avançar.",
    "Sorte favorece quem começa com clareza, não com pressa.",
    "Um sim bem colocado vale mais que três disputas.",
    "Canalize energia num projeto único até o fim do dia.",
    "O dia pede pioneirismo emocional: honestidade sem rudês.",
    "Pequenas vitórias físicas elevam o ânimo — mova o corpo.",
    "Ouça o corpo antes do ego; equilíbrio traz fluência.",
    "Convites sinceros surgem — aceite com critério afetuoso.",
    "Recomeços curtos são seus aliados hoje.",
    "Evite cortar caminhos alheios; trace o seu.",
    "Humor leve resolve tensões que força não resolve.",
    "Assuma liderança num detalhe doméstico ou de trabalho.",
    "Reconheça um medo e agindo devagar você o dissolve.",
  ],
  Touro: [
    "Persistência suave colhe mais que teimosia dura.",
    "Prazer simples recarrega — música, comida, silêncio.",
    "Sorte caminha com paciência financeira e tacto.",
    "Valorize o que já construiu antes de pedir mais.",
    "Toque, textura e ritmo acalmam a mente acelerada.",
    "Um compromisso estável merece sua palavra revisada.",
    "Beleza ao redor reorganiza pensamentos dispersos.",
    "Evite mudanças radicais; refine o que existe.",
    "Corpo pede descanso proporcional ao esforço.",
    "Pequenos luxos conscientes elevam o dia.",
    "Lealdade é ouro — escolha bem onde deposita.",
    "Natureza ou plantas trazem respostas sutis.",
    "Planeje um passo material para a semana.",
    "Ouvir sem julgar fortalece vínculos próximos.",
  ],
  Gêmeos: [
    "Curiosidade bem direcionada vira insight útil.",
    "Conversas curtas e verdadeiras evitam ruído.",
    "Sorte favorece quem escreve ou nomeia o que sente.",
    "Duas ideias podem coexistir — integre antes de escolher.",
    "Trocar notícias traz pistas; filtre com calma.",
    "Humor inteligente desarma tensões em volta.",
    "Estudo rápido ou leitura leve abre caminhos.",
    "Evite dispersão: uma lista de três itens basta.",
    "Viagens mentais pedem aterragem no corpo.",
    "Ouvir outro lado evita mal-entendidos.",
    "Breves pausas entre tarefas aumentam foco.",
    "Palavras gentis multiplicam oportunidades.",
    "Experimente um novo ângulo num problema velho.",
    "Silêncio também comunica — use com intenção.",
  ],
  Câncer: [
    "Lar em ordem reflete paz interior.",
    "Memórias boas nutrem decisões de hoje.",
    "Sorte acompanha quem protege limites com carinho.",
    "Águas calmas curam — hidrate-se literal e metaforicamente.",
    "Vínculos familiares pedem escuta empática.",
    "Cozinhar ou partilhar mesa aproxima corações.",
    "Permita-se vulnerabilidade escolhida com quem confia.",
    "Intuição fala baixo — diminua o ruído externo.",
    "Pequenos rituais noite/manhã reorganizam energia.",
    "Perdão leve (de si ou do outro) alivia o peito.",
    "Segurança emocional antes de grandes saltos.",
    "Decoração ou arrumação expressam autocuidado.",
    "Chame alguém querido sem agenda oculta.",
    "Chuva ou música suave pode ser seu aliado.",
  ],
  Leão: [
    "Brilhar sem ofuscar é arte — pratique hoje.",
    "Generosidade espontânea retorna em forma inesperada.",
    "Sorte favorece quem celebra também os outros.",
    "Criatividade pede palco pequeno mas verdadeiro.",
    "Orgulho saudável não precisa de aplauso constante.",
    "Liderar é servir visibilidade a um propósito coletivo.",
    "Coragem de pedir ajuda também é força.",
    "Sol no rosto ou luz quente elevam o ânimo.",
    "Um gesto teatral gentil pode curar tensão.",
    "Evite drama desnecessário — substitua por humor.",
    "Reconhecimento interno sustenta mais que likes.",
    "Presenteie tempo ou elogio específico a alguém.",
    "Autenticidade atrai as conexões certas.",
    "Descanse o protagonismo quando o corpo pedir.",
  ],
  Virgem: [
    "Ordem pequena revela grande eficiência.",
    "Detalhe bem feito poupa retrabalho depois.",
    "Sorte caminha com método e descanso proporcional.",
    "Saúde cotidiana merece um ajuste gentil hoje.",
    "Critique menos o processo; elogie um passo concluído.",
    "Listas e horários são aliados, não prisões.",
    "Servir com excelência sem esgotar-se é o equilíbrio.",
    "Limpeza física ou digital abre espaço mental.",
    "Precisão verbal evita mal-entendidos úteis.",
    "Aceite imperfeição onde não é crítica.",
    "Pequenos hábitos sustentam grandes metas.",
    "Natureza ou caminhada organiza pensamentos.",
    "Documente uma ideia antes que escape.",
    "Autocompaixão reduz tensão nas costas e mandíbula.",
  ],
  Libra: [
    "Beleza equilibrada nas escolhas atrai harmonia.",
    "Diplomacia sincera vale mais que concordância vazia.",
    "Sorte favorece parcerias com regras claras.",
    "Estética ao redor influencia decisões — cuide do ambiente.",
    "Ouvir ambos lados antes de julgar acelera paz.",
    "Um elogio honesto desbloqueia tensão social.",
    "Justiça começa em acordos pequenos do dia.",
    "Evite procrastinar decisões médias — defina prazo.",
    "Arte, música ou dança restabelecem centro.",
    "Compromisso saudável inclui seu bem-estar.",
    "Espelhos sociais distorcem — volte ao seu valor interno.",
    "Mesas redondas e diálogos curtos funcionam.",
    "Charme natural funciona melhor com verdade.",
    "Balance trabalho e pausa sem culpa.",
  ],
  Escorpião: [
    "Profundidade escolhida supera intensidade reativa.",
    "Confiança se constrói com gestos pequenos repetidos.",
    "Sorte favorece quem transforma medo em pesquisa interna.",
    "Segredos desnecessários pesam — liberte um com tacto.",
    "Desejo consciente clarifica prioridades.",
    "Finalizar um ciclo velho abre espaço novo.",
    "Intimidade pede honestidade gradual, não avalanche.",
    "Observação silenciosa revela motivações úteis.",
    "Evite jogos de poder; prefira transparência.",
    "Água, banho ou mergulho simbólico renovam.",
    "Perdoar não é esquecer — é não dar poder ao passado.",
    "Coragem emocional impressiona mais que controle.",
    "Investigue causas raiz sem autopunição.",
    "Renovação surge onde você solta o antigo.",
  ],
  Sagitário: [
    "Horizontes amplos começam com um passo honesto.",
    "Sentido de humor philosophico dissolve rigidez.",
    "Sorte acompanha quem estuda ou ensina algo pequeno.",
    "Viagem mental ou física curta já expande visão.",
    "Evangelizar menos, perguntar mais.",
    "Fe sincera não precisa provar nada a ninguém.",
    "Leis morais pessoais revisadas trazem leveza.",
    "Esportes ou ar livre reorganizam o ânimo.",
    "Promessas vagas frustram — seja específico.",
    "Estrangeiro ou diferente pode inspirar soluções.",
    "Otimismo fundamentado evita quedas duras.",
    "Publicar ou partilhar ideia madura abre portas.",
    "Aceite limites geográficos como desafio criativo.",
    "Gratidão pelo aprendizado atrai mais aprendizado.",
  ],
  Capricórnio: [
    "Disciplina compassiva sustenta longo prazo.",
    "Metas altas pedem degraus mensuráveis hoje.",
    "Sorte favorece reputação construída com consistência.",
    "Autoridade interior precede cargo ou título.",
    "Trabalho bem feito fala por si — sem autopromoção excessiva.",
    "Pausas estratégicas evitam burnout silencioso.",
    "Regras podem ser revisitadas sem quebrar valores.",
    "Montanha sobe-se respirando — ritmo importa.",
    "Responsabilidade compartilhada multiplica resultados.",
    "Orgulho pela ética vale mais que velocidade.",
    "Investimento de tempo em estrutura poupa crises.",
    "Reconheça progresso invisível aos outros.",
    "Limite ambição ao que o corpo aguenta.",
    "Legado é conjunto de hábitos diários escolhidos.",
  ],
  Aquário: [
    "Ideias para o coletivo brilham quando são simples.",
    "Originalidade inclusiva convence mais que choque vazio.",
    "Sorte favorece redes alinhadas a valores humanos.",
    "Amizade verdadeira merece mensagem sincera hoje.",
    "Futuro desenhado em pequenos experimentos.",
    "Distanciamento emocional útil não é frieza cruel.",
    "Tecnologia ou ferramenta nova pode acelerar uma tarefa.",
    "Rebeldia construtiva reformula sistemas quebrados.",
    "Ouça vozes marginalizadas — há sabedoria lá.",
    "Rotinas flexíveis sustentam criadores.",
    "Visão de longo prazo equilibra impaciência.",
    "Idealismo precisa de pé no chão financeiro.",
    "Comunidade escolhida substitui multidão vazia.",
    "Respire antes de discordar — clareza aparece.",
  ],
  Peixes: [
    "Sonho com pé na terra vira poesia aplicada.",
    "Compaixão sem fronteiras pede centro corporal firme.",
    "Sorte favorece quem boundary gentil protege energia.",
    "Arte, música ou água dissolvem tensão acumulada.",
    "Sincronicidades pedem registro — anote uma.",
    "Fantasia criativa resolve bloqueios práticos.",
    "Evite salvar todos — escolha um foco de ajuda.",
    "Meditação ou silêncio curto reorganiza empatia.",
    "Romance consigo mesmo nutre vínculos externos.",
    "Intuição afiada quando corpo descansa.",
    "Dissolver culpas fantasmas liberta criatividade.",
    "Doação simbólica ou real fecha ciclos kármicos leves.",
    "Fusões confusas pedem nome e forma escritos.",
    "Fe na vida cotidiana transforma rotina em sagrada.",
  ],
};

/** Paletas por signo (primeira entrada alinha ao tom do mapa zodiacal). */
export const COLOR_POOL_BY_SIGN: Record<SignName, readonly ShareCardDailyColor[]> = {
  Áries: [
    { labelPt: "Carmim vivo", hex: "#E11D48" },
    { labelPt: "Terracota", hex: "#C2410C" },
    { labelPt: "Rosa queimado", hex: "#BE185D" },
    { labelPt: "Coral suave", hex: "#FB7185" },
    { labelPt: "Vinho escuro", hex: "#881337" },
    { labelPt: "Âmbar", hex: "#D97706" },
  ],
  Touro: [
    { labelPt: "Verde oliva", hex: "#65A30D" },
    { labelPt: "Musgo profundo", hex: "#3F6212" },
    { labelPt: "Bronze", hex: "#92400E" },
    { labelPt: "Areia quente", hex: "#CA8A04" },
    { labelPt: "Sálvia", hex: "#4D7C0F" },
    { labelPt: "Terracota suave", hex: "#A16207" },
  ],
  Gêmeos: [
    { labelPt: "Amarelo limão", hex: "#EAB308" },
    { labelPt: "Limão pastel", hex: "#FDE047" },
    { labelPt: "Azul céu", hex: "#38BDF8" },
    { labelPt: "Prata suave", hex: "#94A3B8" },
    { labelPt: "Menta clara", hex: "#34D399" },
    { labelPt: "Lavanda", hex: "#C4B5FD" },
  ],
  Câncer: [
    { labelPt: "Turquesa", hex: "#06B6D4" },
    { labelPt: "Azul marinho", hex: "#155E75" },
    { labelPt: "Prata lua", hex: "#CBD5E1" },
    { labelPt: "Pérola", hex: "#E2E8F0" },
    { labelPt: "Azul hortênsia", hex: "#7DD3FC" },
    { labelPt: "Verde água", hex: "#14B8A6" },
  ],
  Leão: [
    { labelPt: "Laranja solar", hex: "#F97316" },
    { labelPt: "Ouro velho", hex: "#CA8A04" },
    { labelPt: "Âmbar queimado", hex: "#EA580C" },
    { labelPt: "Rosa dourado", hex: "#FB923C" },
    { labelPt: "Mostarda", hex: "#D97706" },
    { labelPt: "Vermelho vivo", hex: "#DC2626" },
  ],
  Virgem: [
    { labelPt: "Verde floresta", hex: "#16A34A" },
    { labelPt: "Verde sálvia", hex: "#22C55E" },
    { labelPt: "Bege natural", hex: "#D6D3D1" },
    { labelPt: "Verde musgo", hex: "#15803D" },
    { labelPt: "Pedra", hex: "#78716C" },
    { labelPt: "Verde menta", hex: "#4ADE80" },
  ],
  Libra: [
    { labelPt: "Amarelo suave", hex: "#FACC15" },
    { labelPt: "Rose quartz", hex: "#FDA4AF" },
    { labelPt: "Azul pastel", hex: "#93C5FD" },
    { labelPt: "Champagne", hex: "#FEF3C7" },
    { labelPt: "Lavanda clara", hex: "#DDD6FE" },
    { labelPt: "Verde sage", hex: "#86EFAC" },
  ],
  Escorpião: [
    { labelPt: "Violeta profundo", hex: "#7C3AED" },
    { labelPt: "Berinjela", hex: "#581C87" },
    { labelPt: "Vinho", hex: "#6B21A8" },
    { labelPt: "Azul meia-noite", hex: "#312E81" },
    { labelPt: "Rubi escuro", hex: "#9D174D" },
    { labelPt: "Carvão azulado", hex: "#1E293B" },
  ],
  Sagitário: [
    { labelPt: "Vermelho sagitário", hex: "#DC2626" },
    { labelPt: "Laranja forte", hex: "#EA580C" },
    { labelPt: "Índigo", hex: "#4338CA" },
    { labelPt: "Roxo real", hex: "#7E22CE" },
    { labelPt: "Azul viagem", hex: "#2563EB" },
    { labelPt: "Terracota", hex: "#B45309" },
  ],
  Capricórnio: [
    { labelPt: "Verde pinho", hex: "#4D7C0F" },
    { labelPt: "Cinza ardósia", hex: "#475569" },
    { labelPt: "Marrom terra", hex: "#78350F" },
    { labelPt: "Carvão", hex: "#334155" },
    { labelPt: "Oliva escura", hex: "#57534E" },
    { labelPt: "Azul petróleo", hex: "#0F766E" },
  ],
  Aquário: [
    { labelPt: "Azul elétrico", hex: "#0EA5E9" },
    { labelPt: "Ciano", hex: "#22D3EE" },
    { labelPt: "Azul cobalto", hex: "#2563EB" },
    { labelPt: "Prata tecnológica", hex: "#A8A29E" },
    { labelPt: "Turquesa neon", hex: "#06B6D4" },
    { labelPt: "Íris suave", hex: "#818CF8" },
  ],
  Peixes: [
    { labelPt: "Violeta sonho", hex: "#8B5CF6" },
    { labelPt: "Lavanda profunda", hex: "#7C3AED" },
    { labelPt: "Azul atlântico", hex: "#0369A1" },
    { labelPt: "Verde água-marinha", hex: "#2DD4BF" },
    { labelPt: "Rosa sereno", hex: "#F0ABFC" },
    { labelPt: "Índigo suave", hex: "#6366F1" },
  ],
};
