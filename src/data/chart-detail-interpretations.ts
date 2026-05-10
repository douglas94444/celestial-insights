import type { PlanetKey, SignName } from "@/lib/astrology/zodiac";
import type { AspectType } from "@/lib/astrology/calculate";
import { MOON_IN_SIGN, SUN_IN_SIGN } from "@/data/interpretations";

type SignText = Record<SignName, string>;

/** Temas das 12 casas (sistema de casas iguais / referência geral). */
export const HOUSE_MEANINGS: Record<number, string> = {
  1: "Casa 1 — Eu vivido: identidade, corpo, primeira impressão e como você inicia. É o setor do Ascendente: presença espontânea e escolhas que abrem caminho.",
  2: "Casa 2 — Recursos próprios: dinheiro ganho com trabalho, valores, talentos materiais e segurança. Também fala do que você considera ‘meu’ no mundo sensível.",
  3: "Casa 3 — Entorno próximo: comunicação, estudos iniciais, irmãos, vizinhos e deslocamentos curtos. É movimento mental e troca diária.",
  4: "Casa 4 — Raízes: lar, família de origem, memória afetiva e fundações internas. Também indica o que te nutre em privado.",
  5: "Casa 5 — Criação e prazer: romance, filhos, arte, hobbies e risco criativo. É onde você brinca com a vida e expressa singularidade.",
  6: "Casa 6 — Rotina útil: trabalho cotidiano, saúde preventiva, hábitos e serviço. É o ajuste fino entre corpo, dever e eficiência.",
  7: "Casa 7 — Eu em espelho: parcerias, contratos, público e projeções sobre o outro. É onde relacionamentos ensinam balanço.",
  8: "Casa 8 — Profundidade compartilhada: intimidade, transformações, recursos alheios e tabus. Também fala de legados psíquicos e materiais.",
  9: "Casa 9 — Horizonte largo: filosofia, viagens longas, ensino superior e sentido de vida. É fé racional e expansão de mundo.",
  10: "Casa 10 — Vocação visível: carreira, reputação, autoridade e papel público. É o topo simbólico — MC — onde você é reconhecido(a).",
  11: "Casa 11 — Tribos e projetos: amizades, redes, causas coletivas e futuros possíveis. É onde ideais encontram grupo.",
  12: "Casa 12 — Transcendência e encerramento: inconsciente, solidão fecunda, instituições de retiro e karma subjetivo. É o antes do renascimento.",
};

export const ASPECT_LABELS: Record<AspectType, string> = {
  conjuncao: "Conjunção",
  oposicao: "Oposição",
  trigono: "Trígono",
  quadratura: "Quadratura",
  sextil: "Sextil",
};

export type AspectMood = "harmonic" | "desafiador" | "neutro";

export function aspectMood(type: AspectType): AspectMood {
  if (type === "trigono" || type === "sextil") return "harmonic";
  if (type === "quadratura" || type === "oposicao") return "desafiador";
  return "neutro";
}

/** Mercúrio completo por signo — tom semelhante à Lua/Sol do projeto. */
export const MERCURY_IN_SIGN: SignText = {
  Áries:
    "Mercúrio em Áries pensa rápido e fala direto. Ideias nascem no impulso e você aprende fazendo debates francos. O desafio é ouvir até o fim antes de decidir.",
  Touro:
    "Mercúrio em Touro elabora devagar e prefere ideias que tenham aplicação real. Você convence pela consistência e pela experiência sensível. Flexibilizar conceitos acelera o crescimento.",
  Gêmeos:
    "Mercúrio em Gêmeos é curiosidade constante e linguagem ágil. Você traduz mundos e conecta pessoas através da informação. Evite dispersão — escolha trincheiras para aprofundar.",
  Câncer:
    "Mercúrio em Câncer pensa com memória afetiva e intuição. Suas palavras protegem ou ferem com intensidade. Escrever e contar histórias pode ser terapêutico.",
  Leão: "Mercúrio em Leão comunica com calor e criatividade. Você dramatiza ideias para inspirar e quer reconhecimento pelo que diz. Equilibre performance com escuta.",
  Virgem:
    "Mercúrio em Virgem é precisão mental e foco em diagnósticos úteis. Você aprende categorizando e melhorando processos. Cuidado com o excesso de crítica no próprio raciocínio.",
  Libra:
    "Mercúrio em Libra busca ideias equilibradas e diplomáticas. Você pensa em duplas — prós e contras — e valoriza estética racional. Decida mesmo quando o tema é incômodo.",
  Escorpião:
    "Mercúrio em Escorpião mergulha no subtexto. Você percebe motivações ocultas e poupa palavras estrategicamente. Transparência escolhida evita isolamentos desnecessários.",
  Sagitário:
    "Mercúrio em Sagitário amplia horizontes mentais. Você filosofa em voz alta e aprende via experiências amplas. Ancore generalidades em exemplos concretos.",
  Capricórnio:
    "Mercúrio em Capricórnio estrutura raciocínio com metas. Você comunica autoridade e responsabilidade; sua palavra tem peso. Permita humor e improviso para não endurecer.",
  Aquário:
    "Mercúrio em Aquário raciocina fora do lugar-comum. Você testa hipóteses radicais e gosta de tecnologia e causas coletivas. Conecte ideias excêntricas ao coração das pessoas.",
  Peixes:
    "Mercúrio em Peixes é pensamento imagético e empático. Você capta o não dito e pode confundir raciocínio com mood. Arte, música e silêncio organizam suas ideias.",
};

const VENUS_IN_SIGN: SignText = {
  Áries:
    "Vênus em Áries ama com coragem e frescor. Você conquista pelo impulso sedutor e odeia jogos demorados. Aprenda que permanência também pode ser apaixonante.",
  Touro:
    "Vênus em Touro busca prazer estável e sensorial. Afeto se constrói no tempo, no toque e na beleza tangible. Cuidado para não confundir segurança com possessividade.",
  Gêmeos:
    "Vênus em Gêmeos valoriza conversa e novidade relacional. Você seduz pela inteligência e variedade. Profundidade pede silêncios compartilhados.",
  Câncer:
    "Vênus em Câncer nutre e quer ser nutrido(a). Laços familiares moldam seu amor; seu lar afetivo é sagrado. Limite fusões que cancelam limites saudáveis.",
  Leão: "Vênus em Leão expressa carinho com generosidade e teatro gentil. Você quer ser escolhido(a) com orgulho e celebra o romance. Humildade torna o brilho sustentável.",
  Virgem:
    "Vênus em Virgem demonstra cuidado na prática: detalhes, saúde e melhoria contínua do relacionamento. Você filtra demais — aceite imperfeição como vínculo.",
  Libra:
    "Vênus em Libra busca beleza e reciprocidade. Você harmoniza conflitos mas pode postergar decisões difíceis. Honestidade gentil fortalece parcerias.",
  Escorpião:
    "Vênus em Escorpião intensifica desejo e lealdade total ou veto. Você mergulha fundo e cobra autenticidade. Confiança é construída devagar — vale o ritual.",
  Sagitário:
    "Vênus em Sagitário precisa de liberdade e significado. Você atrai com humor e visão ampla. Compromisso não é prisão quando há espaço para crescer junto.",
  Capricórnio:
    "Vênus em Capricórnio ama com maturidade e planos. Você respeita tempo, status construído e dever mútuo. Carinho também mora no descanso sem agenda.",
  Aquário:
    "Vênus em Aquário prefere amizade erótica e respeito à singularidade. Você desafia convenções com elegância. Atenção aos afetos que pedem calor explícito.",
  Peixes:
    "Vênus em Peixes dissolve fronteiras na compaixão. Você idealiza e salva — escolha parceiros que honrem sua sensibilidade. Arte e espiritualidade alimentam o romântico.",
};

const MARS_IN_SIGN: SignText = {
  Áries:
    "Marte em Áries acende reação imediata e coragem. Você corre para o combate e lidera pelo exemplo. Canalize fogo em esportes e projetos — evite feridas por impaciência.",
  Touro:
    "Marte em Touro persevera com força lenta. Você defende território e recursos com teimosia produtiva. Mudanças pedem tempo — explosões surgem quando se sente ameaçado.",
  Gêmeos:
    "Marte em Gêmeos debate e multiplica frentes. Sua agressividade é verbal e mental; você contesta ideias. Foque para não dispersar energia em mil disputas.",
  Câncer:
    "Marte em Câncer age por proteção emocional. Você luta pelo lar e pelos seus — às vezes indiretamente. Nomeie raivas em vez de sulcos silenciosos.",
  Leão: "Marte em Leão coloca coração na linha de frente. Você defende orgulho e causas com dramaturgia. Generosidade combativa — cuide do ego ferido.",
  Virgem:
    "Marte em Virgem estrategiza e corrige. Você age por aperfeiçoamento e serviço; irritação vem do caos inútil. Direcione crítica para soluções, não para culpa.",
  Libra:
    "Marte em Libra hesita entre opostos e busca justiça social. Conflito pode vir através de terceiros. Decida o que quer defender antes de negociar eternamente.",
  Escorpião:
    "Marte em Escorpião concentra poder e resistência. Você persiste onde outros desistem e guarda rancor estratégico. Transparência reduz jogos perigosos.",
  Sagitário:
    "Marte em Sagitário expande a luta por ideais. Você disputa verdades e territorios morais. Ancore utopias em passos — fanatismo cansa aliados.",
  Capricórnio:
    "Marte em Capricórnio disciplina ambição. Você conquista metas com resistência e hierarquia clara. Permita pausa — trabalho não é único campo de coragem.",
  Aquário:
    "Marte em Aquário rebela-se por causas coletivas. Você inova na luta e valoriza amizade militante. Conecte ideal a afeto — frieza afasta aliados.",
  Peixes:
    "Marte em Peixes age por compaixão ou fuga. Você pode sabotar subtraindo presença. Canalize em arte, dança e lutas espirituais — nomeie limites.",
};

const JUPITER_IN_SIGN: SignText = {
  Áries:
    "Júpiter em Áries amplifica iniciativa e fé no impulso. Oportunidades chegam quando você abre frentes novas com ética. Evite superestimar riscos.",
  Touro:
    "Júpiter em Touro expande recursos com paciência. Crescimento vem do valor real — talentos, terra, prazer estável. Cuidado com complacência.",
  Gêmeos:
    "Júpiter em Gêmeos multiplica aprendizado e redes. Sorte aparece em cursos, contratos e conversas. Profundidade equilibra dispersão.",
  Câncer:
    "Júpiter em Câncer protege lar e linhagem. Expansão vem de nutrir — família, público sensível, memória coletiva. Limite dependência emocional.",
  Leão: "Júpiter em Leão celebra talento e generosidade visível. Reconhecimento chega quando você ensina pelo exemplo. Orgulho excessivo fecha portas.",
  Virgem:
    "Júpiter em Virgem cresce via serviço competente e saúde integrada. Sorte em trabalho útil e métodos refinados. Perfeccionismo pode adiar lançamentos.",
  Libra:
    "Júpiter em Libra favorece parcerias justas e arte diplomática. Alianças amplificam sucesso. Decida antes de harmonizar demais.",
  Escorpião:
    "Júpiter em Escorpião transforma crises em poder regenerativo. Recursos compartilhados e psique profunda expandem juntos. Honestidade radical protege.",
  Sagitário:
    "Júpiter em Sagitário exalta mestres, viagens e filosofia. Você busca sentido grande — compartilhe saberes. Dogmatismo limita a graça.",
  Capricórnio:
    "Júpiter em Capricórnio recompensa mérito e estrutura. Ascensão vem de responsabilidade e tempo. Medo de falhar pode estreitar o horizonte.",
  Aquário:
    "Júpiter em Aquário expande redes futuristas e causas coletivas. Inovação social atrai apoio. Frieza ética pode afastar coração.",
  Peixes:
    "Júpiter em Peixes dissolve fronteiras espirituais e artísticas. Compaixão abre portas — mas escolha onde mergulhar. Fronteiras claras evitem sacrificício vazio.",
};

const SATURN_IN_SIGN: SignText = {
  Áries:
    "Saturno em Áries testa coragem com limite. Você aprende paciência na liderança e assume culpa pelo impulso. Disciplina focada vira autoridade madura.",
  Touro:
    "Saturno em Touro ensina valor real versus segurança defensiva. Recursos crescem devagar e com mérito. Flexibilize apego ao controle.",
  Gêmeos:
    "Saturno em Gêmeos cobra coerência mental. Você pode duvidar da própria voz até estruturar estudos. Ensinar formaliza seu pensamento.",
  Câncer:
    "Saturno em Câncer carrega dever familiar profundo. Lar pode pesar antes de virar base sólida. Acolher vulnerabilidade é maturidade.",
  Leão: "Saturno em Leão questiona reconhecimento e criatividade responsável. Você constrói legado com tempo — plateia vem depois da obra.",
  Virgem:
    "Saturno em Virgem refina métodos e saúde. Crítica interna ensina excelência — não castigo. Serviço consistente abre portas.",
  Libra:
    "Saturno em Libra atrasa parcerias até amadurecer contratos emocionais. Justiça pede limites claros. Compromisso sério substitui fantasias.",
  Escorpião:
    "Saturno em Escorpião trabalha poder e confiança. Crises definem quem fica. Integridade íntima é moeda rara.",
  Sagitário:
    "Saturno em Sagitário modera fé e dogmas. Você busca verdade com método — viagens viram peregrinação séria. Humildade intelectual liberta.",
  Capricórnio:
    "Saturno em Capricórnio honra hierarquia interna. Você assume autoridade cedo — descanso permitido é parte do plano.",
  Aquário:
    "Saturno em Aquário estrutura utopias em sistemas reais. Amizade exige consistência; rebeldia com ética sustenta redes.",
  Peixes:
    "Saturno em Peixes solidifica fronteiras espirituais. Empatia precisa de ritual e sonhos precisam de prazo. Arte disciplinada cura.",
};

const URANUS_IN_SIGN: SignText = {
  Áries:
    "Urano em Áries rompe tradições pelo impulso — pioneiros tecnológicos e políticos. Você rebela pelo íntimo ‘eu posso’.",
  Touro:
    "Urano em Touro revoluciona dinheiro, corpo e ecologia. Mudanças chegam devagar mas rearranjam valor material.",
  Gêmeos:
    "Urano em Gêmeos reinventa mídia e curiosidade coletiva. Redes e ideias saltam de forma imprevisível.",
  Câncer:
    "Urano em Câncer choca lar e memória coletiva — famílias e nações redefinem pertencimento.",
  Leão: "Urano em Leão quebra moldes de autoridade criativa. Celebridades e artistas questionam ‘como brilhar’.",
  Virgem:
    "Urano em Virgem altera trabalho, saúde e dados cotidianos. Rotinas viram laboratórios de eficiência radical.",
  Libra: "Urano em Libra experimenta justiça e parcerias — leis de convívio mudam rápido.",
  Escorpião:
    "Urano em Escorpião transforma tabu e poder compartilhado — crises revelam verdades súbitas.",
  Sagitário:
    "Urano em Sagitário perturba filosofias e fronteiras — verdades globais são revisadas.",
  Capricórnio: "Urano em Capricórnio desafia instituições — hierarquias caem para renascer.",
  Aquário: "Urano em Aquário exalta redes futuristas e ciência cidadã — o coletivo inventa amanhã.",
  Peixes: "Urano em Peixes dissolve dogmas espirituais — arte e compaixão ganham novos idiomas.",
};

const NEPTUNE_IN_SIGN: SignText = {
  Áries:
    "Netuno em Áries sonha guerreiros compassivos — espiritualidade impulsiva e confusão entre ação e sacrifício.",
  Touro: "Netuno em Touro idealiza natureza e prazer — arte sensorial e utopias materiais suaves.",
  Gêmeos:
    "Netuno em Gêmeos dissolve fronteiras mentais — narrativas coletivas seduzem e confundem.",
  Câncer: "Netuno em Câncer fusiona lar e oceano psíquico — família como mito.",
  Leão: "Netuno em Leão glamuriza criadores — carisma místico e salvação pelo palco.",
  Virgem: "Netuno em Virgem sacraliza serviço — saúde holística e culpa sutil no cotidiano.",
  Libra: "Netuno em Libra idealiza par perfeito — sedução espiritual nas relações.",
  Escorpião:
    "Netuno em Escorpião mergulha no inconsciente coletivo — mistérios sexuais e cura psíquica.",
  Sagitário: "Netuno em Sagitário dilata fé — mestres iluminados ou fanatismo velado.",
  Capricórnio:
    "Netuno em Capricórnio dissolve estruturas — sonhos de poder e medo de irrelevância.",
  Aquário:
    "Netuno em Aquário visiona humanidade — utopias tecnológicas e solidariedade idealizada.",
  Peixes: "Netuno em Peixes dissolve o eu — compaixão oceânica e fuga como caminho.",
};

const PLUTO_IN_SIGN: SignText = {
  Áries:
    "Plutão em Áries transforma coragem coletiva — surgimento de guerreiros e cirurgias civilizatórias brutais.",
  Touro:
    "Plutão em Touro move montanhas materiais — poder sobre terra, comida e dinheiro com lentidão implacável.",
  Gêmeos: "Plutão em Gêmeos escava palavras — segredos midiáticos e verdades duplas.",
  Câncer: "Plutão em Câncer reconfigura lar e nação — apego e abandono como escola.",
  Leão: "Plutão em Leão reinventa autoridade criativa — ídolos nascem e caem em holofote total.",
  Virgem: "Plutão em Virgem purifica corpo e sistema — obsessão por controle útil.",
  Libra: "Plutão em Libra escava contratos — justiça sexual e poder relacional.",
  Escorpião:
    "Plutão em Escorpião habita o próprio domínio — morte e renascimento íntimos coletivos.",
  Sagitário: "Plutão em Sagitário quebra templos de verdade — fanatismo e revelação filosófica.",
  Capricórnio: "Plutão em Capricórnio reforma sistemas — impérios caem para novas hierarquias.",
  Aquário: "Plutão em Aquário remodela redes — tecnologia e democracia sob pressão transformadora.",
  Peixes:
    "Plutão em Peixes dissolve e reconstrói fé — espiritualidade profunda e vitimização coletiva.",
};

const CHIRON_IN_SIGN: SignText = {
  Áries:
    "Quiron em Áries sensibiliza a coragem: feridas na autoafirmação ensinam cura pela ação honesta. Você ajuda outros a ousarem sem violência.",
  Touro:
    "Quiron em Touro toca valor e corpo — insegurança material vira sabedoria sobre abundância sustentável. Toque e ritmo curam.",
  Gêmeos:
    "Quiron em Gêmeos fala da ferida da palavra — silêncios e excessos verbais ensinam escuta terapêutica. Ensinar é cicatrizar narrativas.",
  Câncer:
    "Quiron em Câncer carrega o ninho que faltou — cuidar dos outros restaura o lar interno. Família escolhida importa.",
  Leão: "Quiron em Leão questiona se você merece brilhar — criar sem vergonha se torna oferenda. A palmas ensina generosidade.",
  Virgem:
    "Quiron em Virgem expõe hipocondria ou serviço excessivo — saúde holística nasce do aceite imperfeito. Pequenos rituais curam.",
  Libra:
    "Quiron em Libra ferida na reciprocidade — você aprende acordos justos depois de absorver culpa alheia. Mediação é dom.",
  Escorpião:
    "Quiron em Escorpião mergulha na dor tabu — sexualidade, poder e confiança viram laboratório de cura profunda.",
  Sagitário:
    "Quiron em Sagitário busca sentido depois da decepção moral — filosofias compassivas substituem dogmas feridos.",
  Capricórnio:
    "Quiron em Capricórnio testa mérito e tempo — carregar culpa de não bastar ensina autoridade compassiva.",
  Aquário:
    "Quiron em Aquário isola antes de conectar tribos — ser estranho ensina inclusão radical de outsiders.",
  Peixes:
    "Quiron em Peixes dissolve limites da dor — compaixão sem fronteiras pede ancoragem espiritual saudável.",
};

const NORTH_NODE_IN_SIGN: SignText = {
  Áries:
    "Nodo Norte em Áries — evoluir pela coragem autêntica e pela iniciativa direta. Solte a necessidade excessiva de agradar (eixo Libra).",
  Touro:
    "Nodo Norte em Touro — crescer pela estabilidade, presença corporal e valores claros. Menos drama relacional improdutivo.",
  Gêmeos:
    "Nodo Norte em Gêmeos — destino mental: perguntar, nomear e trocar ideias com leveza. Menos necessidade de filosofia fuga.",
  Câncer:
    "Nodo Norte em Câncer — caminho de pertencimento acolhedor e vínculos honestos. Liberte excesso de prestígio vazio.",
  Leão: "Nodo Norte em Leão — brilhar com coração generoso e criatividade responsável. Menos necessidade de validação apenas pelo grupo.",
  Virgem:
    "Nodo Norte em Virgem — serviço competente, saúde integrada e método humilde. Menos fuga em glamour ou romance sem substância.",
  Libra:
    "Nodo Norte em Libra — parcerias equilibradas e ética relacional. Menos padrões impossíveis ou heroísmo solitário forçado.",
  Escorpião:
    "Nodo Norte em Escorpião — intimidade, confiança e poder compartilhado autêntico. Menos apego a conforto que evita mudança.",
  Sagitário:
    "Nodo Norte em Sagitário — sentido aberto, ensino e exploração ética. Menos gossip mental ou dispersão sem norte.",
  Capricórnio:
    "Nodo Norte em Capricórnio — responsabilidade, vocação e maturidade visível. Menos dependência emocional que adia propósito.",
  Aquário:
    "Nodo Norte em Aquário — redes futuras, amizade radical e causas coletivas com lucidez. Menos show pessoal como único valor.",
  Peixes:
    "Nodo Norte em Peixes — fé viva, arte compassiva e dissolução do controle rígido. Menos microgestão ansiosa do mundo.",
};

const SOUTH_NODE_IN_SIGN: SignText = {
  Áries:
    "Nodo Sul em Áries — talento antigo de sobreviver sozinho(a) e reagir rápido; equilibre com parceria consciente (Norte em Libra).",
  Touro:
    "Nodo Sul em Touro — conforto acostumado e teimosia de segurança; desafio é flexibilizar valores sem medo.",
  Gêmeos:
    "Nodo Sul em Gêmeos — mente habituada a comparar e dispersar; sintetize sabedoria em visão coerente.",
  Câncer:
    "Nodo Sul em Câncer — memória afetiva intensa e proteção excessiva; vocação pede responsabilidade visível.",
  Leão: "Nodo Sul em Leão — brilho que seduz mas pode egocentrismo; compartilhe palco com propósito coletivo.",
  Virgem:
    "Nodo Sul em Virgem — perfeccionismo e critério afiado; permita magia e imperfeição fecunda.",
  Libra:
    "Nodo Sul em Libra — dependência de validação social; afirme desejos mesmo quando desagradam.",
  Escorpião:
    "Nodo Sul em Escorpião — poder psíquico e fusões intensas; pratique estabilidade e confiança diária.",
  Sagitário:
    "Nodo Sul em Sagitário — verdades absolutas e fuga por ideal; cultive escuta fina e dados concretos.",
  Capricórnio:
    "Nodo Sul em Capricórnio — dever e armadura emocional; abra lar e vulnerabilidade sem perder limite.",
  Aquário:
    "Nodo Sul em Aquário — distanciamento ‘cool’ e grupo como refúgio; integre calor humano íntimo.",
  Peixes:
    "Nodo Sul em Peixes — fusão empática e confusão de limites; use método e corpo para ancorar espiritualidade.",
};

const PLANET_SIGN: Partial<Record<PlanetKey, SignText>> = {
  mercury: MERCURY_IN_SIGN,
  venus: VENUS_IN_SIGN,
  mars: MARS_IN_SIGN,
  jupiter: JUPITER_IN_SIGN,
  saturn: SATURN_IN_SIGN,
  uranus: URANUS_IN_SIGN,
  neptune: NEPTUNE_IN_SIGN,
  pluto: PLUTO_IN_SIGN,
  chiron: CHIRON_IN_SIGN,
  north_node: NORTH_NODE_IN_SIGN,
  south_node: SOUTH_NODE_IN_SIGN,
};

export function planetInSignInterpretation(key: PlanetKey, sign: SignName): string {
  if (key === "sun") return SUN_IN_SIGN[sign];
  if (key === "moon") return MOON_IN_SIGN[sign];
  const block = PLANET_SIGN[key];
  if (block?.[sign]) return block[sign];
  return `${key} em ${sign}: interpretação resumida em expansão — observe o signo como pano de fundo para este arquétipo no seu mapa.`;
}

// ---------------------------------------------------------------------------
// Interpretações planeta-em-casa
// ---------------------------------------------------------------------------

type HouseText = Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, string>;

const SUN_IN_HOUSE: HouseText = {
  1: "A identidade se constrói pela presença e pela iniciativa; há uma necessidade de ser visto e reconhecido como indivíduo único. A vitalidade é recurso consciente que se fortalece ao agir com autenticidade.",
  2: "Identidade ligada a recursos e valores materiais — construir segurança própria fortalece o senso de si. Generosidade com o que se tem gera confiança e atrai mais abundância.",
  3: "Expressão verbal e intelectual é central; você brilha em comunicação, escrita e conexões próximas. Aprender é também mostrar quem você é — ensinar e trocar ideias alimentam a autoestima.",
  4: "Identidade enraizada na família e no lar — o espaço privado é onde a energia vital se reconstitui. Questões de herança e pertencimento moldam profundamente o senso de self.",
  5: "Criatividade e romance são campos de autoexpressão essencial; você precisa criar, brincar e ser admirado pelo que produz. Hobbies e projetos pessoais revelam propósito e vitalidade.",
  6: "Identidade construída pelo trabalho e pelo serviço cotidiano — você se realiza na utilidade e na competência diária. Saúde é assunto central de autoconhecimento e merece atenção contínua.",
  7: "Identidade que se desperta no encontro com o outro; parcerias são espelhos necessários para o autoconhecimento. Aprenda a brilhar de forma genuína sem depender de validação externa.",
  8: "Identidade ligada à transformação e ao que está oculto — crises reveladoras são o caminho de autocrescimento. Psicologia profunda e recursos compartilhados atraem atenção e poder pessoal.",
  9: "Identidade que se expande pela filosofia, viagens e ensinamentos; você encontra significado no horizonte. Ensinar e compartilhar saberes é uma das formas mais satisfatórias de autoexpressão.",
  10: "Vocação e reputação como eixo de identidade — ser reconhecido pelo trabalho e pela autoridade importa profundamente. O legado público é construído com propósito e exige responsabilidade.",
  11: "Identidade expressa no coletivo e nas causas; amizades e grupos espelham valores mais profundos. Você brilha quando o individual serve ao todo e a sua originalidade tem espaço.",
  12: "Identidade que busca recolhimento e transcendência; a criatividade floresce em solidão produtiva. Serviço silencioso e espiritualidade alimentam o senso de ser de forma profunda.",
};

const MOON_IN_HOUSE: HouseText = {
  1: "Emoções visíveis e reações instintivas marcam a presença — o corpo registra humor com rapidez. Acolher a própria sensibilidade como força, e não fraqueza, é caminho de autoconhecimento.",
  2: "Segurança emocional ligada a recursos materiais e conforto sensorial; flutuações de humor afetam a relação com dinheiro. Cultivar estabilidade financeira acalma a psique profundamente.",
  3: "Pensamento tingido de emoção e memória afetiva — você aprende e comunica melhor quando se sente seguro emocionalmente. Escrever e conversar são formas naturais de processar sentimentos.",
  4: "Vida emocional centrada no lar e na família; o ambiente doméstico tem peso enorme no bem-estar. Raízes profundas nutrem — e trabalhar a herança familiar traz paz interior duradoura.",
  5: "Emoções expressas em romance, criatividade e relação com filhos; alegria genuína regenera o ser. O coração precisa de palco e calor humano para florescer e sentir-se completo.",
  6: "Saúde e rotina são espelhos do estado emocional — estresse se instala no corpo antes de ser nomeado. Rituais diários simples e autocuidado consistente equilibram humor e vitalidade.",
  7: "Necessidades emocionais espelhadas nas relações; você busca segurança afetiva no par. Reciprocidade nutre mais que dependência — aprender a receber é tão importante quanto oferecer.",
  8: "Emoções profundas e transformadoras — lutos e renascimentos simbólicos são frequentes. Psicologia e intimidade revelam camadas da psique; confiar no processo de mudança cura.",
  9: "Emoções expandidas pela busca de sentido; viagens, filosofia e espiritualidade alimentam o interior. Doutrinas rígidas podem tornar-se âncoras emocionais — examine-as com liberdade.",
  10: "Vida pública colorida por humor e necessidade de cuidar do coletivo; a carreira pode oscilar entre exposição e recolhimento. O trabalho mais satisfatório nutre tanto quem faz quanto quem recebe.",
  11: "Pertencer a grupos é necessidade emocional profunda; amizades íntimas sustentam o senso de segurança. Causas coletivas alimentam o coração e dão significado ao cotidiano.",
  12: "Vida emocional rica e sutil, muitas vezes vivida em privado; sonhos e intuição são recursos valiosos. Solidão criativa recarrega — mas isolamento crônico pede atenção e cuidado.",
};

const MERCURY_IN_HOUSE: HouseText = {
  1: "Mente ágil e presença comunicativa — você pensa em voz alta e aprende pela interação direta. Palavras e gestos revelam sua forma de processar o mundo com velocidade e curiosidade.",
  2: "Raciocínio voltado a recursos práticos e finanças; você avalia com lógica o que tem valor tangível. Habilidades de comunicação podem ser fonte concreta de renda e oportunidade.",
  3: "Mercúrio em território próprio — mente vivaz, múltiplos interesses e fluência verbal natural. Você aprende com facilidade e conecta ideias; profundidade é o ganho que equilibra a dispersão.",
  4: "Pensamento enraizado em memória e tradição familiar; você reflete sobre origens com frequência. Conversar com família ou sobre o passado organiza ideias e traz clareza emocional.",
  5: "Mente criativa que pensa em imagens, histórias e jogos; você se expressa com humor e inventividade. Escrita, arte e projetos lúdicos estimulam o intelecto e revelam dons únicos.",
  6: "Raciocínio analítico e metódico aplicado ao trabalho e à saúde; você analisa detalhes e organiza processos. Listas e rotina mental aumentam a produtividade e reduzem a ansiedade.",
  7: "Comunicação moldada pelas relações — você pensa melhor em diálogo e cresce pelo debate com o outro. Contratos e negociações são terrenos naturais; ouça antes de concluir.",
  8: "Mente investigativa e apetite por segredos e psicologia profunda; você pesquisa fundo e diz o que outros evitam. Terapia e estudos do inconsciente enriquecem e transformam a perspectiva.",
  9: "Pensamento filosófico e apetite por grandes ideias; você aprende através de viagens, culturas e ensinamentos. Publicar e ensinar amplificam o que sabe e criam legado intelectual.",
  10: "Comunicação como pilar da reputação profissional; você constrói carreira com palavras e clareza. Escrita, ensino e gestão são terrenos onde a mente organizada brilha com autoridade.",
  11: "Mente social e conectada a redes e tecnologia; você articula ideias para grupos com eficiência. Causas coletivas ganham voz através de você — colaboração intelectual é seu ponto forte.",
  12: "Pensamento intuitivo e introvertido — você processa em silêncio antes de compartilhar. Meditação, poesia e reflexão privada organizam insights valiosos que emergem no tempo certo.",
};

const VENUS_IN_HOUSE: HouseText = {
  1: "Charme natural e presença que atrai sem esforço aparente; você valoriza estética na forma de se apresentar. Cuidado de si é também forma de amar — beleza e harmonia são linguagens naturais.",
  2: "Prazer em recursos materiais, beleza e conforto; você atrai prosperidade quando vive de acordo com seus valores. Arte e experiências sensoriais têm lugar legítimo no orçamento emocional.",
  3: "Afeto expresso em palavras e trocas cotidianas — você seduz pela inteligência e pela conversa gentil. Relações com irmãos ou vizinhos têm charme especial e trocas afetivas ricas.",
  4: "Amor pelo lar e pela família — você investe beleza e harmonia no espaço doméstico. Relacionamentos profundos precisam de raiz e privacidade; herança afetiva molda o coração.",
  5: "Romance vibrante e prazer na criatividade; você floresce em amores expressivos e projetos estéticos. Crianças e hobbies são campos de alegria genuína e autoexpressão amorosa.",
  6: "Afeto expresso em serviço e cuidado prático; você aprecia rotinas que têm beleza e utilidade. Relações de trabalho agradáveis importam profundamente para o bem-estar cotidiano.",
  7: "Vênus em território próprio — parcerias harmoniosas são prioridade central da vida. Você busca equilíbrio e beleza na troca; casamentos e contratos tendem a ter arte e elegância.",
  8: "Amor intenso e transformador; você atrai vínculos profundos que exigem vulnerabilidade total. Recursos compartilhados e erotismo consciente são terrenos ricos de aprendizado.",
  9: "Romance com quem expande horizontes — parceiros de outras culturas ou crenças são atraentes. Você aprecia beleza filosófica e aprende amor através de viagens e descobertas.",
  10: "Carreira tocada pela estética, diplomacia ou arte; você atrai reconhecimento pelo charme profissional. Reputação benevolente e relações harmoniosas no trabalho abrem portas significativas.",
  11: "Afeto dentro de grupos e amizades próximas; você valoriza redes como fonte de alegria. Amigos íntimos podem virar parceiros — ou vice-versa — em conexões que têm profundidade real.",
  12: "Amor vivido em privado ou em contextos espirituais; você tem sensibilidade artística profunda. Serviço compassivo e arte alimentam o coração de forma que relações convencionais às vezes não alcançam.",
};

const MARS_IN_HOUSE: HouseText = {
  1: "Energia vital e assertividade marcantes — você age antes de pensar e inspira pelo exemplo direto. Liderança é natural; canalize impulsividade em iniciativas com propósito e consistência.",
  2: "Determinação em construir segurança própria; você age para garantir recursos e defende o que é seu com vigor. Ganho financeiro pelo esforço pessoal é fonte de orgulho e satisfação.",
  3: "Mente combativa e linguagem direta ao ponto — você debate com paixão e não evita confronto de ideias. Projetos de comunicação e escrita ganham energia rápida quando o interesse é genuíno.",
  4: "Ação focada no lar e na família — você protege o ninho com garra e determinação. Conflitos domésticos podem surgir; canalize energia em reformas e conquistas concretas do espaço privado.",
  5: "Entusiasmo no romance e na criação; você corteja com energia e cria com paixão visível. Esportes, projetos artísticos e relação com filhos ganham combustível e resultados concretos.",
  6: "Trabalho duro e eficiência como expressão de vitalidade; você age com método no serviço diário. Cuide do corpo — há tendência a exigir demais da própria resistência física e mental.",
  7: "Parcerias que geram atrito criativo — você atrai pessoas assertivas ou que desafiam seus limites. A dinâmica relacional estimula ação; aprender a cooperar sem competir fortalece os vínculos.",
  8: "Desejo intenso e vontade de transformação profunda; você vai fundo em crises e emerge renovado. Sexualidade consciente e gestão de recursos compartilhados pedem atenção e clareza.",
  9: "Luta por ideais e expansão do território de crenças; você age para disseminar verdades com convicção. Viagens motivam e podem se tornar pontos de virada na trajetória de vida.",
  10: "Ambição visível e trabalho incansável pela carreira; você sobe pelo esforço próprio e não teme competição. Autoridade é construída com garra, consistência e resultados mensuráveis.",
  11: "Energia direcionada a grupos e causas coletivas; você age para mudar sistemas e mobiliza amigos. Liderança em redes e movimentos sociais surge naturalmente e com entusiasmo genuíno.",
  12: "Ação subterrânea — você age nos bastidores ou em contextos de retiro e silêncio. Raiva reprimida pede saída criativa ou espiritual; serviço silencioso é forma poderosa de Marte.",
};

const JUPITER_IN_HOUSE: HouseText = {
  1: "Expansão do ser — presença generosa e otimismo contagiante que inspira o entorno. Você cresce ao assumir novos papéis com fé; cuidado com excesso de autoconfiança que ignora limites.",
  2: "Abundância material cresce com o tempo e com o mérito; você tem senso de valor que atrai recursos. Generosidade com o que se tem retroalimenta a prosperidade de forma natural.",
  3: "Aprendizado constante e redes de contatos amplas como terreno de crescimento. Você expande através de ideias, cursos e intercâmbios; escrita e ensino abrem portas significativas.",
  4: "Lar amplo e família como fonte de bênçãos e recursos emocionais. Você encontra crescimento no retorno às raízes e em investir no espaço privado; herança emocional é rica.",
  5: "Prazer, romance e criatividade são campos de expansão genuína; filhos ou projetos criativos trazem alegria. Você é generoso no amor e no jogo de vida, atraindo conexões vivas.",
  6: "Crescimento através do trabalho bem feito e da saúde integrada; oportunidades chegam pelo serviço competente. Você melhora sistemas e rotinas com bom humor e visão de conjunto.",
  7: "Parcerias como veículo de expansão — você encontra sorte em contratos e relacionamentos equilibrados. Sócio ou cônjuge pode trazer crescimento e abertura de horizontes significativa.",
  8: "Transformações profundas que abrem novos ciclos de vida; herança e recursos compartilhados são terrenos de crescimento. Crises viram portais quando há confiança no processo.",
  9: "Júpiter em território próprio — sabedoria, viagens e filosofia como vocação natural. Você cresce ensinando e sendo ensinado; mundo grande cabe nos seus horizontes generosos.",
  10: "Sucesso profissional e reputação que crescem com o tempo e a integridade; reconhecimento vem pela sabedoria. Liderança ética abre oportunidades que o esforço isolado não alcança.",
  11: "Redes amplas e amigos que inspiram e expandem horizontes; causas coletivas trazem sorte. Você cresce contribuindo para projetos maiores que o ego — coletivo como caminho.",
  12: "Bênçãos vindas de retiro, espiritualidade e serviço silencioso; você se expande ao abrir mão do controle. Fé profunda e intuição são recursos subestimados que protegem e orientam.",
};

const SATURN_IN_HOUSE: HouseText = {
  1: "Seriedade e autodisciplina marcam a presença; você constrói identidade com cuidado e responsabilidade. Com o tempo, maturidade vira autoridade genuína que inspira confiança duradoura.",
  2: "Aprendizado lento sobre valor e segurança material — recursos chegam com esforço e mérito. O desafio é soltar o apego ao controle financeiro como única forma de se sentir seguro.",
  3: "Comunicação cuidadosa e pensamento estruturado; você pode demorar a falar, mas quando o faz, tem peso. Estudo formal e rigor mental constroem conhecimento sólido e respeitado.",
  4: "Responsabilidades familiares e domésticas são pesadas, mas profundamente formadoras. O lar pode ter sido austero; você aprende a criar raízes sólidas e duradouras com o tempo.",
  5: "Criatividade que precisa de permissão — medo de julgamento pode bloquear a expressão espontânea. Com disciplina e prática, arte e romance ganham profundidade real e autenticidade.",
  6: "Trabalho e saúde são terrenos de exigência elevada; você se cobra muito no serviço diário. Ritual de autocuidado e limites claros de esforço protegem a vitalidade no longo prazo.",
  7: "Relacionamentos chegam com responsabilidade e comprometimento sério — parcerias duradouras exigem maturidade mútua. A espera por quem está à altura vale o tempo e a paciência.",
  8: "Transformações lentas e processos de cura que pedem paciência e honestidade; você lida com crises com seriedade. Herança e recursos compartilhados requerem clareza e limites bem definidos.",
  9: "Filosofia e crenças estruturadas com rigor; você questiona antes de acreditar e exige consistência. Ensino e escrita com profundidade são terrenos de realização — o caminho é lento, mas sólido.",
  10: "Saturno em território próprio — carreira construída com esforço consistente e ética impecável. Reconhecimento vem tarde, mas dura; autoridade é merecida, nunca herdada ou improvisada.",
  11: "Amizades selecionadas e grupos com propósito real; você prefere poucos laços de confiança profunda. Projetos coletivos pedem comprometimento de longo prazo e responsabilidade mútua.",
  12: "Solidão como mestra — retiro, reflexão e karma subjetivo processados com seriedade e método. Medos ocultos pedem luz; serviço espiritual disciplinado é caminho concreto de cura.",
};

const URANUS_IN_HOUSE: HouseText = {
  1: "Presença original e imprevisível que desafia expectativas — você reinventa a si mesmo com frequência. Autenticidade radical é recurso central; conformidade sufoca o potencial criativo.",
  2: "Relação disruptiva com dinheiro e valores — entradas e saídas financeiras podem surpreender. Soluções criativas para sustento funcionam; inovação pode ser fonte de renda não convencional.",
  3: "Comunicação inovadora e pensamento não linear que conecta ideias inesperadas. Você aprende de formas alternativas e prospera em ambientes onde tecnologia e redes são terrenos naturais.",
  4: "Lar e família marcados por mudanças ou estruturas incomuns; você pode mudar de base com frequência. Liberdade dentro do espaço doméstico é necessidade genuína, não capricho.",
  5: "Criatividade original e romances que fogem do convencional; você ama de forma única. Projetos artísticos disruptivos energizam e abrem caminhos que o formato tradicional não alcança.",
  6: "Rotinas que precisam de variação para funcionar — monotonia sufoca a produtividade. Você inova métodos de trabalho e saúde; trabalho autônomo ou em áreas tecnológicas pode se encaixar melhor.",
  7: "Parcerias incomuns ou relações que desafiam normas sociais; você precisa de espaço dentro do vínculo. Liberdade compartilhada fortalece laços — fusão excessiva sufoca a conexão.",
  8: "Transformações abruptas e revelações súbitas; você experimenta crises que redefinem perspectivas completamente. Interesses em ocultismo, tecnologia e psicologia profunda são comuns e férteis.",
  9: "Filosofias alternativas e visão de mundo não convencional; você questiona instituições com coragem. Aprendizado autodidata e viagens inesperadas expandem horizontes de forma transformadora.",
  10: "Carreira que inova ou perturba o status quo; você muda de direção profissional com coragem e convicção. Liderança em tecnologia, ciência ou movimentos sociais é terreno de realização.",
  11: "Redes futuristas e amizades diversas que desafiam hierarquias convencionais; você se sente em casa em grupos progressistas. Causas coletivas recebem energia renovadora e transformadora.",
  12: "Revelações espirituais súbitas e vida interior que surpreende com insights poderosos. Você experimenta intuições que chegam sem aviso — soltar o controle amplifica a percepção.",
};

const NEPTUNE_IN_HOUSE: HouseText = {
  1: "Presença etérea e empática — você absorve o ambiente ao redor com facilidade e sensibilidade. Arte e espiritualidade dão contorno ao self e ajudam a definir uma identidade fluida.",
  2: "Relação idealizada com recursos — oscilações financeiras pedem atenção e ancoragem prática. Criatividade e compaixão como fontes de sustento fazem sentido e trazem satisfação.",
  3: "Comunicação poética e intuição verbal aguçada; você capta o não dito com naturalidade. Arte, música e narrativa organizam ideias difusas e revelam insights profundos.",
  4: "Lar permeado de atmosfera onírica e memória afetiva idealizada — família como mito pessoal. Criar um lar real, com raízes concretas, é o trabalho que equilibra o sonho com a vida.",
  5: "Romance idealizado e criatividade com profundidade espiritual; você ama com entrega total. Arte e expressão são campos de transcendência — o risco de idealização pede discernimento.",
  6: "Saúde sensível e trabalho com dimensão de serviço; rotinas rígidas podem ser difíceis de manter. Práticas integrativas e profissões de cuidado são terrenos férteis e satisfatórios.",
  7: "Parcerias marcadas por idealização e empatia profunda; você busca conexão de alma. Vínculos espirituais ou artísticos são os mais satisfatórios — discernimento protege o coração.",
  8: "Profundidade mística e sensibilidade às camadas ocultas da existência; luto e transformação são vividos de forma intuitiva. Psicologia e espiritualidade se complementam naturalmente.",
  9: "Fé viva e espiritualidade como filosofia de vida; você encontra sentido em tradições místicas. Dogmas rígidos não cabem — a busca pelo significado é o próprio caminho.",
  10: "Carreira com dimensão artística, espiritual ou de serviço compassivo; a vocação emerge com autenticidade. Clareza de objetivos cresce com o tempo e a honestidade sobre os próprios dons.",
  11: "Grupos e amizades com dimensão utópica; você se sente em casa em comunidades espirituais ou artísticas. Avalie estruturas antes de comprometer — o coração idealiza, a mente discerne.",
  12: "Netuno em território próprio — vida interior rica, sonhos vívidos e conexão espiritual profunda. Solidão criativa regenera e inspira; transcendência é recurso natural e fértil.",
};

const PLUTO_IN_HOUSE: HouseText = {
  1: "Presença de alta intensidade — você transforma quem encontra e passa por mortes simbólicas da própria identidade. Poder pessoal vem da honestidade radical consigo mesmo.",
  2: "Recursos como tema de poder e transformação; você pode perder e reconstruir patrimônio várias vezes. Talentos ocultos emergem exatamente nas crises financeiras mais desafiadoras.",
  3: "Linguagem como instrumento de poder; você pode calar — ou revelar verdades que mudam conversas. Pesquisa profunda e comunicação transformadora são recursos valiosos e raros.",
  4: "Raízes familiares marcadas por dinâmicas de poder e regeneração; segredos de família pedem luz. Transformar o lar interno é o trabalho de vida mais importante e libertador.",
  5: "Criatividade que toca temas profundos e romantismo intenso — você não aceita superficialidade. Filhos ou projetos criativos podem ser catalisadores de grandes e inesperadas mudanças.",
  6: "Trabalho e saúde como arenas de transformação; crises profissionais ou físicas revelam padrões a mudar. Profissões de cura, investigação ou psicologia atraem e dão sentido.",
  7: "Parcerias que transformam profundamente — você atrai pessoas intensas como espelhos de crescimento. Relações saudáveis exigem transparência e equilíbrio genuíno de poder.",
  8: "Plutão em território próprio — morte simbólica, renascimento, intimidade e recursos compartilhados são centrais. Você navega crises com coragem e emerge diferente e mais inteiro.",
  9: "Filosofias que passam por radicalizações e purgas; você questiona sistemas de crença até encontrar verdade vivida. Viagens ou estudos avançados marcam transformações profundas.",
  10: "Carreira marcada por quedas e ascensões dramáticas; você reconstrói a reputação com resiliência notável. Liderança em campos de transformação social, saúde ou pesquisa é poderosa.",
  11: "Grupos e redes como campo de poder e transformação coletiva; você pode liderar movimentos ou romper com eles. Amizades intensas redefinem identidade social de forma permanente.",
  12: "Transformações acontecem no inconsciente e em retiro; você processa crises em silêncio antes de emergir. Espiritualidade profunda e karma coletivo têm peso especial na trajetória.",
};

const CHIRON_IN_HOUSE: HouseText = {
  1: "Ferida na autoafirmação e na presença — dificuldade em simplesmente existir sem justificativas. Ao integrar isso, você se torna mentor de autenticidade; presença plena é a cura.",
  2: "Dor em torno de valor próprio e recursos materiais; insegurança financeira ou baixa autoestima pedem integração. Ao trabalhar isso, você ensina abundância sustentável e real.",
  3: "Ferida na comunicação — dificuldade de ser ouvido ou de confiar na própria voz desde cedo. Ao sanar isso, você se torna comunicador que cura outros com palavras e escuta.",
  4: "Dor nas raízes — família, lar ou infância com feridas a integrar ao longo da vida. Ao fazer o trabalho interno, você transforma herança em base de força genuína e duradoura.",
  5: "Ferida na expressão criativa e no direito ao prazer; vergonha de brilhar pode bloquear dons reais. Ao sanar isso, você inspira outros a se expressarem sem medo ou culpa.",
  6: "Dor no corpo e na rotina — doença crônica ou serviço excessivo como padrão aprendido. Ao integrar, você aprende cuidado que cura sem sacrifício; saúde vira vocação concreta.",
  7: "Ferida nas relações — padrões de abandono, projeção ou desequilíbrio de poder recorrentes. Ao trabalhar isso, você se torna mediador e conselheiro de vínculos saudáveis.",
  8: "Dor em transformações — luto, traumas de intimidade ou crises existenciais profundas vividas cedo. Ao integrar a sombra, você se torna guia de outros em seus próprios renascimentos.",
  9: "Ferida em crenças e sentido de vida — decepção com sistemas filosóficos ou religiosos. Ao sanar, você encontra fé pessoal que inspira e ensina com compaixão e liberdade.",
  10: "Dor em torno de reconhecimento e carreira — sensação de nunca ser suficiente profissionalmente. Ao curar isso, você lidera com compaixão e uma autoridade genuína e confiável.",
  11: "Ferida no pertencimento — sentir-se estranho em grupos desde a infância ou adolescência. Ao integrar, você cria espaços de inclusão onde outsiders encontram tribo e acolhimento.",
  12: "Dor espiritual — sofrimento difuso, karma acumulado ou sensação de invisibilidade persistente. Ao acolher o inconsciente, você se torna canal de cura coletiva e transcendência.",
};

const NORTH_NODE_IN_HOUSE: HouseText = {
  1: "Caminho de vida que pede presença plena e iniciativa própria; solte a dependência de parcerias para definir identidade. Ser você mesmo sem aprovação constante é a grande lição evolutiva.",
  2: "Destino ligado a construir recursos próprios e clareza de valores concretos. Você cresce ao priorizar segurança real e talentos tangíveis; independência material é conquista evolutiva.",
  3: "Caminho de crescimento pela comunicação, aprendizado e trocas próximas. Você evolui ao perguntar, nomear e conectar ideias; o papel de comunicador é parte central do destino.",
  4: "Destino enraizado no lar, na família e no pertencimento emocional profundo. Você cresce ao criar bases sólidas e nutrir vínculos; família é escola central de vida e propósito.",
  5: "Caminho de vida que pede criatividade, romance e expressão autêntica e corajosa. Você evolui ao brincar, criar e amar sem medo; prazer genuíno não é luxo — é destino real.",
  6: "Crescimento pela disciplina útil, serviço concreto e saúde integrada no cotidiano. Você evolui ao refinar hábitos e contribuir com competência; excelência no dia a dia é o caminho.",
  7: "Destino que se cumpre em parcerias equilibradas e genuinamente justas. Você cresce ao aprender a colaborar, ceder e receber; o outro é o maior espelho evolutivo disponível.",
  8: "Caminho de transformação profunda — luto, intimidade e poder compartilhado como escola de vida. Você evolui ao mergulhar, não ao evitar; crises são portais de crescimento real.",
  9: "Destino ligado à expansão de horizontes — viagens, filosofia e ensinamentos como missão. Você cresce ao buscar sentido além do familiar; mestre e estudante ao mesmo tempo.",
  10: "Caminho de vida que pede vocação visível e responsabilidade pública com integridade. Você evolui ao assumir autoridade com ética; legado profissional é parte da missão de vida.",
  11: "Crescimento dentro de redes, grupos e causas coletivas que transcendem o interesse pessoal. Você evolui ao servir algo maior que o ego; amizades profundas e projetos futuristas abrem o caminho.",
  12: "Destino espiritual — fé, recolhimento e serviço silencioso como missão de vida. Você evolui ao soltar o controle e confiar no invisível; arte e transcendência são seus portos de chegada.",
};

const SOUTH_NODE_IN_HOUSE: HouseText = {
  1: "Conforto antigo no individualismo — tende a agir sozinho e definir tudo pelo self sem consultar. O desafio é aprender cooperação genuína e a perspectiva enriquecedora do outro.",
  2: "Familiaridade com posse e segurança material como âncora emocional central. O caminho pede generosidade e abertura ao desconhecido além dos limites do conforto material.",
  3: "Zona de conforto na comunicação rápida e nas trocas de informação superficiais. Você já sabe comunicar — agora aprenda a buscar sabedoria mais profunda e consistente.",
  4: "Familiaridade com recolhimento e cuidado familiar como identidade e refúgio. O desafio é assumir papel público e vocação visível além das paredes do lar.",
  5: "Conforto no prazer individual e na criatividade centrada no eu e no reconhecimento. O caminho pede serviço coletivo, humildade de rotina e generosidade com o que se cria.",
  6: "Zona de conforto no dever, na análise e na servidão cotidiana como forma de existir. O desafio é expandir para sentido maior — filosofia, espiritualidade e fé viva.",
  7: "Familiaridade com o espelho relacional — você aprende pelo outro e se define pelos vínculos. O caminho pede autoafirmação e iniciativa própria independente de validação externa.",
  8: "Zona de conforto em transformações e profundidade intensa como modo de ser no mundo. O desafio é construir estabilidade de valores e recursos sem fusão excessiva ou crise permanente.",
  9: "Familiaridade com grandes verdades e filosofias como território seguro do pensamento. Agora aprenda detalhe, escuta e trocas cotidianas concretas que constroem realidade.",
  10: "Conforto em autoridade e responsabilidade pública como identidade central. O caminho pede recolhimento, lar e nutrimento emocional como fundação real do sucesso.",
  11: "Zona de conforto no coletivo e nas causas como forma de escapar do individual. O desafio é expressão criativa individual, romance autêntico e prazer sem culpa.",
  12: "Familiaridade com retiro, espiritualidade e karma subjetivo como modo de existir. O caminho pede trabalho concreto, serviço útil e saúde cotidiana integrada e consistente.",
};

const PLANET_HOUSE: Partial<Record<PlanetKey, HouseText>> = {
  sun: SUN_IN_HOUSE,
  moon: MOON_IN_HOUSE,
  mercury: MERCURY_IN_HOUSE,
  venus: VENUS_IN_HOUSE,
  mars: MARS_IN_HOUSE,
  jupiter: JUPITER_IN_HOUSE,
  saturn: SATURN_IN_HOUSE,
  uranus: URANUS_IN_HOUSE,
  neptune: NEPTUNE_IN_HOUSE,
  pluto: PLUTO_IN_HOUSE,
  chiron: CHIRON_IN_HOUSE,
  north_node: NORTH_NODE_IN_HOUSE,
  south_node: SOUTH_NODE_IN_HOUSE,
};

export function planetInHouseInterpretation(key: PlanetKey, house: number): string {
  const entry = PLANET_HOUSE[key];
  if (!entry) return "";
  return entry[house as keyof HouseText] ?? "";
}
