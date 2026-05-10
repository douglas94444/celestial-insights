import type { SignName } from "@/lib/astrology/zodiac";

type SignText = Record<SignName, string>;

export const SUN_IN_SIGN: SignText = {
  Áries:
    "Sol em Áries traz uma essência pioneira e corajosa. Você é movido(a) pela ação, pela vontade de iniciar coisas novas e pela necessidade de afirmar sua individualidade. Sua energia vital se acende quando há um desafio, e você lidera com entusiasmo, ainda que precise aprender a domar a impulsividade.",
  Touro:
    "Sol em Touro confere estabilidade, paciência e um forte senso de valor próprio. Sua identidade se constrói no que é tangível: prazeres, conforto, segurança e tudo o que pode ser cultivado com tempo. Você prospera quando se permite desfrutar do mundo material com presença.",
  Gêmeos:
    "Sol em Gêmeos é luz curiosa e versátil. Você se reconhece nas trocas, nas ideias, na palavra. Sua vitalidade se renova com aprendizado e diversidade, e seu maior dom é traduzir mundos diferentes através da comunicação.",
  Câncer:
    "Sol em Câncer é uma essência sensível, protetora e profundamente ligada às raízes. Você se realiza quando cuida de um lar — afetivo ou simbólico — e quando honra suas memórias e laços familiares. A intuição é seu mapa.",
  Leão: "Sol em Leão brilha com generosidade, criatividade e dignidade. Você precisa expressar quem é, ser visto(a) e reconhecido(a) por seu coração único. Quando alinha autoestima com humildade, inspira ao redor como o próprio astro-rei.",
  Virgem:
    "Sol em Virgem é precisão, dedicação e desejo de servir. Você se realiza no aperfeiçoamento, no cuidado com o detalhe e no uso prático da inteligência. Seu desafio é abandonar o crítico interno para celebrar o trabalho bem feito.",
  Libra:
    "Sol em Libra busca harmonia, beleza e equilíbrio nas relações. Você se reconhece em parcerias, na diplomacia e no senso estético. Sua jornada é encontrar o eu dentro do nós, sem se diluir no outro.",
  Escorpião:
    "Sol em Escorpião carrega intensidade, profundidade e poder de transformação. Você não tem medo do que é tabu — confronta o oculto, o psíquico, o íntimo. Renasce muitas vezes ao longo da vida.",
  Sagitário:
    "Sol em Sagitário é fogo expansivo: aventura, filosofia, fé na vida. Você busca sentido, viaja por terras e ideias, e contagia com otimismo. Cuidado para não fugir do compromisso em nome da liberdade.",
  Capricórnio:
    "Sol em Capricórnio é ambição madura, disciplina e responsabilidade. Você constrói com solidez, conquista pelo mérito e amadurece cedo. Aprenda a se permitir leveza — o sucesso também mora no agora.",
  Aquário:
    "Sol em Aquário é originalidade, visão de futuro e senso coletivo. Você se reconhece como ponte entre o que é e o que pode vir a ser. Sua liberdade nasce da capacidade de pensar diferente do rebanho.",
  Peixes:
    "Sol em Peixes traz sensibilidade oceânica, compaixão e ligação com o invisível. Você dissolve fronteiras, sente o que os outros sentem e se realiza na arte, na espiritualidade ou no serviço amoroso ao próximo.",
};

export const MOON_IN_SIGN: SignText = {
  Áries:
    "Lua em Áries: emoções rápidas, francas e independentes. Você sente com intensidade e age antes de processar. Sua segurança nasce da liberdade de ser quem é, sem filtros.",
  Touro:
    "Lua em Touro: emoções estáveis, sensoriais e leais. Você se sente seguro(a) com rotinas, afetos consistentes e prazeres simples — uma comida, um abraço, uma cama macia.",
  Gêmeos:
    "Lua em Gêmeos: emoções inquietas, mentais e curiosas. Você processa o que sente conversando, escrevendo e aprendendo. Precisa de variedade emocional para não se entediar.",
  Câncer:
    "Lua em Câncer: a Lua se sente em casa aqui. Sua sensibilidade é profunda, protetora e cíclica. Você se nutre da família, dos afetos antigos e do colo que oferece e recebe.",
  Leão: "Lua em Leão: emoções calorosas, dramáticas e generosas. Você precisa se sentir admirado(a) e querido(a) para florescer. Seu coração é grande e seu orgulho também.",
  Virgem:
    "Lua em Virgem: emoções discretas, analíticas e prestativas. Você se acalma cuidando, organizando, ajudando. Seu desafio é receber afeto sem precisar 'merecer' por servir.",
  Libra:
    "Lua em Libra: emoções relacionais, estéticas e diplomáticas. Você se sente bem em ambientes harmoniosos e com pessoas equilibradas. Conflito te desestabiliza — aprenda a tolerá-lo.",
  Escorpião:
    "Lua em Escorpião: emoções intensas, secretas e transformadoras. Você sente profundamente, ama profundamente, suspeita profundamente. Vulnerabilidade real é seu maior tesouro.",
  Sagitário:
    "Lua em Sagitário: emoções otimistas, inquietas e expansivas. Você se nutre de viagens, ideias e horizontes abertos. Precisa de espaço para respirar e crescer.",
  Capricórnio:
    "Lua em Capricórnio: emoções contidas, responsáveis e maduras. Você se sente seguro(a) construindo, conquistando e sendo confiável. Permita-se também ser cuidado(a).",
  Aquário:
    "Lua em Aquário: emoções singulares, mentalizadas e independentes. Você precisa de espaço afetivo e de liberdade. Conexões devem respeitar sua individualidade radical.",
  Peixes:
    "Lua em Peixes: emoções fluídas, empáticas e místicas. Você absorve o ambiente como uma esponja. Arte, música e espiritualidade são seus refúgios essenciais.",
};

export const ASC_IN_SIGN: SignText = {
  Áries:
    "Ascendente em Áries: você se apresenta ao mundo com energia direta, coragem e iniciativa. Sua persona é a do pioneiro — alguém que entra em uma sala e marca presença. A vida pede que você desenvolva sua autonomia.",
  Touro:
    "Ascendente em Touro: você se apresenta com calma, sensualidade e firmeza. Sua persona convida ao toque e à confiança. A vida pede que você construa segurança duradoura, no corpo e nos bens.",
  Gêmeos:
    "Ascendente em Gêmeos: você se apresenta como alguém leve, comunicativo e curioso. Sua persona é a do mensageiro. A vida pede que você se mova, aprenda e troque ideias com muitas pessoas.",
  Câncer:
    "Ascendente em Câncer: você se apresenta como sensível, acolhedor(a) e reservado(a). Sua persona é a do(a) cuidador(a). A vida pede que você desenvolva um lar — afetivo, físico, interno.",
  Leão: "Ascendente em Leão: você se apresenta com presença, brilho e calor. Sua persona é a do(a) artista nato(a). A vida pede que você expresse sua singularidade sem pedir desculpa.",
  Virgem:
    "Ascendente em Virgem: você se apresenta como discreto(a), atento(a) e útil. Sua persona é a do(a) artesão(ã). A vida pede que você refine seu ofício e cuide do mundo nos detalhes.",
  Libra:
    "Ascendente em Libra: você se apresenta com charme, equilíbrio e elegância. Sua persona é a do(a) diplomata. A vida pede que você aprenda a cooperar mantendo seu centro.",
  Escorpião:
    "Ascendente em Escorpião: você se apresenta com magnetismo, intensidade e mistério. Sua persona é a do(a) investigador(a) das profundezas. A vida pede que você atravesse transformações profundas.",
  Sagitário:
    "Ascendente em Sagitário: você se apresenta como otimista, expansivo(a) e aventureiro(a). Sua persona é a do(a) viajante. A vida pede que você busque sentido em horizontes amplos.",
  Capricórnio:
    "Ascendente em Capricórnio: você se apresenta como sério(a), competente e ambicioso(a). Sua persona é a do(a) construtor(a). A vida pede que você assuma responsabilidades com maturidade.",
  Aquário:
    "Ascendente em Aquário: você se apresenta como original, independente e antenado(a) com o futuro. Sua persona é a do(a) inovador(a). A vida pede que você invente seu próprio caminho.",
  Peixes:
    "Ascendente em Peixes: você se apresenta como sonhador(a), gentil e fluido(a). Sua persona é a do(a) místico(a). A vida pede que você cultive arte, fé e compaixão.",
};

export const HOROSCOPE_DAILY: Record<SignName, string> = {
  Áries:
    "Hoje sua energia pede ação consciente. Comece algo novo, mas escolha bem onde investir seu fogo — atalhos podem custar caro. Boa hora para conversas francas.",
  Touro:
    "Um dia para honrar seu ritmo. Pequenos prazeres recarregam você mais do que grandes feitos. Atenção a finanças e ao corpo: ambos pedem cuidado paciente.",
  Gêmeos:
    "Trocas múltiplas marcam o dia. Sua mente está rápida e sociável — aproveite para resolver pendências, escrever, agendar conversas. Evite dispersar a energia em excesso.",
  Câncer:
    "O afeto está em alta. Cuide de quem ama e deixe-se cuidar. Memórias antigas podem visitar — observe-as com gentileza, sem se enredar nelas.",
  Leão: "Sua presença ilumina. Seja generoso(a) com seu brilho, mas escute também. Reconhecimento chega quando você cria sem precisar de plateia.",
  Virgem:
    "Dia produtivo se você focar no essencial. Liste prioridades, descarte o supérfluo. Cuidado com o crítico interno: nem tudo precisa ser perfeito para ser bom.",
  Libra:
    "Relações são o tema. Busque equilíbrio entre dar e receber. Decisões adiadas podem ser tomadas agora — escolha o que está alinhado com sua paz.",
  Escorpião:
    "Profundidade emocional pede espaço. Não fuja do que sente — atravesse. O que termina hoje abre caminho para um renascimento valioso.",
  Sagitário:
    "Sua alma quer voar. Estude, planeje viagens, sonhe alto. Mas ancore o entusiasmo em pequenos passos concretos — assim a visão se realiza.",
  Capricórnio:
    "Foco e disciplina rendem hoje. Seu trabalho é reconhecido pelos que importam. Reserve um momento para descanso real — você não é uma máquina.",
  Aquário:
    "Ideias originais surgem. Compartilhe com quem entende. Sua liberdade é sagrada, mas conexão verdadeira não te aprisiona — apenas te enraíza.",
  Peixes:
    "Intuição apurada. Confie nas sutilezas, nos sonhos e nas sincronicidades. Arte e contemplação te colocam em sintonia com o que realmente importa.",
};
