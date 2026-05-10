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
