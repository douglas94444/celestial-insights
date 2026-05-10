import type { AspectMood } from "./chart-detail-min.ts";
import { aspectMood } from "./chart-detail-min.ts";
import type { SynastryCrossAspect } from "./synastry-cross.ts";
import type { PlanetKey } from "./zodiac.ts";

export type NatalCategory = "luminares" | "pessoais" | "sociais" | "externos";

function natalCategory(planetNatal: PlanetKey): NatalCategory {
  if (planetNatal === "sun" || planetNatal === "moon") return "luminares";
  if (planetNatal === "mercury" || planetNatal === "venus" || planetNatal === "mars")
    return "pessoais";
  if (planetNatal === "jupiter" || planetNatal === "saturn") return "sociais";
  return "externos";
}

function poolKey(mood: AspectMood, cat: NatalCategory): string {
  return `${mood}_${cat}`;
}

/** Templates curtos por humor do aspecto e categoria do ponto natal — só para reflexão. */
const HINT_POOLS: Record<string, readonly string[]> = {
  harmonic_luminares: [
    "Seus pontos mais íntimos (Sol/Lua) recebem um trânsito fluido — ótimo para alinhar intenção e humor.",
    "Vitalidade e sensibilidade conversam bem agora; deixe a intuição informar decisões sem pressa.",
    "Momento favorável para se observar com gentileza: o que você sente pode estar maduro para mudanças sutis.",
    "Harmonia nos luminares sugere aceitar seu ritmo natural sem se cobrar excessivamente.",
    "Boa janela para nutrir autoestima e necessidades afetivas de forma equilibrada.",
    "Clima propício a autocuidado sincero — poucas palavras, mais presença.",
    "É tempo de integrar coração e propósito: pequenos gestos contam mais que grandes promessas.",
  ],
  desafiador_luminares: [
    "Tensão nos luminares pode mexer na imagem ou nas necessidades emocionais — pause antes de reagir.",
    "Contraste entre como você se sente e como quer aparecer pode gerar atrito interno hoje.",
    "Um alerta gentil: exaustão ou irritação podem ser mensagens legítimas do corpo.",
    "É útil nomear o que incomoda sem dramatizar; conflitos assim pedem honestidade consigo mesmo.",
    "Cuide para não projetar no ambiente o que está sendo trabalhado na sua intimidade.",
    "Momentos desafiadores nos pontos vitais pedem mais sono, hidratação e limites claros.",
  ],
  neutro_luminares: [
    "Nos luminares, este aspecto pede observação neutra — nem épico nem tragédico; apenas dados sobre você.",
    "Sol ou Lua em ênfase moderada: aproveite para registrar insights sem obrigar mudanças radicais.",
    "Um empurrão sutil na autoimagem ou humor pode aparecer — registre e reflita.",
  ],
  harmonic_pessoais: [
    "Mercúrio, Vênus ou Marte natal em clima favorável favorece diálogo afetuoso ou iniciativa harmoniosa.",
    "Bom momento para afastar tensões na comunicação e propor algo mais gentil ou criativo.",
    "Motivação e relações ganham fluência — boas mini-metáforas para revisitar projetos ou vínculos.",
    "Expressão e afeto fluem com menos atrito; aproveite para resolver algo específico com educação.",
    "Um ritmo mais cooperativo marca seus pontos pessoais; celebre progressos modestos.",
    "Estilo mental ou sensorial pode estar mais disponível — aprendizado rápido e prazer simples.",
  ],
  desafiador_pessoais: [
    "Mercúrio, Vênus ou Marte natal sob tensão pode disparar debates ou impulsos — respiração primeiro.",
    "Palavras afiadas ou desejos urgentes pedem canalização consciente; escolha o timing.",
    "Pequenos atritos nos relacionamentos ou na forma de agir são comuns — menos autopunição, mais escuta.",
    "Impaciência pode soar alta hoje; testar mensagens antes de enviar ajuda bastante.",
    "Um atrito produtivo: onde você precisa ser mais direto(a), mas sem cortesia?",
    "Corpo e vontade podem pedir movimento físico para dissipar tensões.",
  ],
  neutro_pessoais: [
    "Pessoais sob ênfase moderada — ajustes cotidianos na comunicação, afeto ou ação são suficientes.",
    "Mercúrio/Vênus/Marte em segundo plano ativo: observe hábitos que já funcionam.",
  ],
  harmonic_sociais: [
    "Júpiter ou Saturno natal em fluência favorece visão de médio prazo ou reorganização estável.",
    "Expansão ética ou estrutura saudável podem aparecer — pense em alinhamento de valores.",
    "Aprendizado institucional ou maturidade em relacionamentos ganham espaço hoje.",
    "É tempo de crescimento responsável: ambições que você pode sustentar no tempo.",
    "Sociais harmoniosos apoiam contratos informais de confiança — revisite compromissos com honestidade.",
  ],
  desafiador_sociais: [
    "Saturno ou Júpiter natal sob pressão pode evidenciar limites externos ou excessos antigos.",
    "Um tema «estrutura x expansão» pode cobrar revisão de expectativas realistas.",
    "Expectativas sociais ou hierárquicas podem parecer pesadas — renegociar é válido.",
    "Contratempos burocráticos ou atrasos testam paciência; foque no próximo passo viável.",
  ],
  neutro_sociais: [
    "Planetas sociais em tom médio — ajustes lentos na agenda ou nas responsabilidades compartilhadas.",
  ],
  harmonic_externos: [
    "Urano, Netuno ou pontos lentos natais sob influxo suave favorecem insights sutis ou descompressão.",
    "Abertura gradual para o novo pode vir por tangentes — não force narrativa linear.",
    "Temas coletivos ou herdados ficam menos pesados hoje; use criatividade simbólica.",
    "Renovações lentas pedem microexperimentos em vez de revoluções imediatas.",
  ],
  desafiador_externos: [
    "Planetas externos natais sob tensão podem trazer sensação de instabilidade coletiva — ancore-se.",
    "Mudanças que você não controla pedem adaptação paciente e menos autoprovocação.",
    "Idealização ou ansiedade de futuro podem disparar — volte ao que é decidível hoje.",
    "Evite decisões irreversíveis só pela adrenalina; o cenário externo está turbulento.",
  ],
  neutro_externos: [
    "Influências lentas em modo neutro — observe narrativas de fundo sem urgência.",
    "Um dia bom para notar padrões de longo prazo sem necessidade de julgar resultado já.",
  ],
};

function sortedAspectsForHints(aspects: SynastryCrossAspect[]): SynastryCrossAspect[] {
  const priority = (natal: PlanetKey) =>
    ["sun", "moon", "venus", "mars"].includes(natal) ? 20 : 0;
  return [...aspects].sort((a, b) => {
    const pa = priority(a.planet2) - a.orb * 3;
    const pb = priority(b.planet2) - b.orb * 3;
    return pb - pa;
  });
}

/** Até `limit` sugestões; texto determinístico (hash estável por índice do aspecto). */
export function interpretiveHintsForAspects(aspects: SynastryCrossAspect[], limit = 6): string[] {
  const sorted = sortedAspectsForHints(aspects);
  const hints: string[] = [];
  for (let i = 0; i < sorted.length && hints.length < limit; i++) {
    const a = sorted[i]!;
    const mood = aspectMood(a.type);
    const cat = natalCategory(a.planet2);
    const key = poolKey(mood, cat);
    const pool = HINT_POOLS[key];
    if (!pool?.length) continue;
    const pick = pool[i % pool.length]!;
    if (!hints.includes(pick)) hints.push(pick);
  }
  if (hints.length === 0 && aspects.length === 0) {
    hints.push(
      "Com poucos aspectos marcantes ao seu mapa, o dia favorece rotinas conscientes e observação leve.",
    );
  }
  return hints.slice(0, limit);
}
