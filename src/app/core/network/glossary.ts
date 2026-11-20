/** Glossário da rede óptica em linguagem simples, usado na ajuda e nos "?" das fichas. */
export interface GlossaryTerm {
  key: string;
  term: string;
  /** Uma frase (dica do "?"). */
  short: string;
  /** Explicação um pouco maior (diálogo do glossário). */
  long: string;
}

export const GLOSSARY: readonly GlossaryTerm[] = [
  {
    key: 'rede-ftth',
    term: 'Rede de fibra (FTTH)',
    short: 'Rede que leva internet por fibra óptica até a casa do cliente.',
    long: 'FTTH quer dizer "fibra até a casa". O sinal sai da OLT, passa por cabos e caixas na rua e chega ao cliente por um cabo fino (drop).',
  },
  {
    key: 'olt',
    term: 'OLT',
    short: 'Equipamento da central que gera o sinal de toda a rede.',
    long: 'A OLT fica na central do provedor. Cada porta PON dela manda sinal para uma fibra, que segue pelos cabos até as caixas e os clientes.',
  },
  {
    key: 'cto',
    term: 'CTO (caixa de atendimento)',
    short: 'Caixa na rua, perto das casas, onde os clientes são conectados.',
    long: 'A Caixa de Terminação Óptica fica em postes ou paredes perto dos clientes. Dentro dela há splitters e portas de atendimento; o cabo de cada cliente é ligado numa porta.',
  },
  {
    key: 'ceo',
    term: 'CEO (caixa de emenda)',
    short: 'Caixa onde fibras de cabos diferentes são emendadas.',
    long: 'A Caixa de Emenda Óptica protege as fusões entre cabos, guardadas em bandejas. É usada onde um cabo se divide ou continua em outro.',
  },
  {
    key: 'dio',
    term: 'DIO',
    short: 'Painel de conexões, geralmente na central, junto da OLT.',
    long: 'O Distribuidor Interno Óptico organiza as fibras que chegam à central e permite ligar e desligar conexões com conectores.',
  },
  {
    key: 'cliente',
    term: 'Cliente',
    short: 'Casa ou empresa atendida, ligada a uma porta de uma CTO.',
    long: 'Cada cliente tem um contrato e usa uma porta de atendimento numa CTO. A situação (ativo, bloqueado, cancelado) diz se ele está recebendo o serviço.',
  },
  {
    key: 'cabo',
    term: 'Cabo óptico',
    short: 'Cabo que carrega fibras de um ponto a outro da rede.',
    long: 'Por dentro, o cabo tem tubos e, dentro de cada tubo, fibras. A linha no mapa mostra por onde ele passa; a ficha mostra de onde sai e onde termina.',
  },
  {
    key: 'cabo-funcao',
    term: 'Função do cabo',
    short: 'Para que o cabo serve: backbone, alimentação, distribuição, drop ou interconexão.',
    long: 'Backbone liga centrais ou grandes trechos; alimentação sai da OLT para os bairros; distribuição leva às CTOs; drop vai da CTO até o cliente; interconexão liga equipamentos próximos.',
  },
  {
    key: 'tubo',
    term: 'Tubo',
    short: 'Tubo colorido dentro do cabo que agrupa algumas fibras.',
    long: 'Os tubos separam as fibras do cabo em grupos (por exemplo, 12 fibras por tubo) e seguem a ordem de cores da norma.',
  },
  {
    key: 'fibra',
    term: 'Fibra',
    short: 'Fio de vidro muito fino por onde passa o sinal de luz.',
    long: 'Cada fibra tem um número no tubo e no cabo, uma cor e uma situação: disponível, ocupada, rompida ou reservada.',
  },
  {
    key: 'cores',
    term: 'Cores das fibras',
    short: 'Ordem de cores da norma: verde, amarelo, branco, azul, vermelho, violeta…',
    long: 'Tubos e fibras seguem a mesma sequência de 12 cores (verde, amarelo, branco, azul, vermelho, violeta, marrom, rosa, preto, cinza, laranja e turquesa) para o técnico achar a fibra certa.',
  },
  {
    key: 'splitter',
    term: 'Splitter',
    short: 'Divide o sinal de uma fibra em várias saídas (1:8 = 8 saídas).',
    long: 'O splitter recebe o sinal por uma entrada e o reparte em 2, 4, 8, 16, 32 ou 64 saídas. Numa CTO, cada saída costuma alimentar uma porta de atendimento.',
  },
  {
    key: 'fusao',
    term: 'Fusão',
    short: 'Emenda permanente entre duas fibras.',
    long: 'Na fusão, duas fibras são soldadas para o sinal continuar de um cabo para outro. Fica guardada numa posição de uma bandeja dentro da caixa.',
  },
  {
    key: 'bandeja',
    term: 'Bandeja',
    short: 'Suporte dentro da caixa onde as fusões ficam guardadas.',
    long: 'Cada bandeja tem um número de posições; cada fusão ocupa uma posição.',
  },
  {
    key: 'conector',
    term: 'Conector',
    short: 'Ligação removível entre duas fibras.',
    long: 'Diferente da fusão, o conector pode ser desligado e religado. É comum no DIO e nas portas das caixas.',
  },
  {
    key: 'porta-pon',
    term: 'Porta PON',
    short: 'Saída de sinal da OLT, ligada a uma fibra de um cabo.',
    long: 'Cada porta PON fica numa placa da OLT. Ligada a uma fibra, ela alimenta uma parte da rede (vários splitters e clientes).',
  },
  {
    key: 'porta-atendimento',
    term: 'Porta de atendimento',
    short: 'Porta da CTO onde o cabo do cliente é ligado.',
    long: 'A porta recebe sinal de uma saída de splitter (ou direto de uma fibra). Só portas livres e com sinal podem receber um cliente.',
  },
  {
    key: 'ponta',
    term: 'Ponta A e ponta B',
    short: 'As duas extremidades de cada fibra: A no início do cabo, B no fim.',
    long: 'O sistema guarda o que está ligado em cada ponta da fibra. O padrão já serve na maioria dos casos; por isso essa opção fica no modo avançado.',
  },
  {
    key: 'perda',
    term: 'Perda (dB)',
    short: 'Quanto do sinal se perde numa emenda ou conexão.',
    long: 'Medida em decibéis (dB). Quanto menor, melhor. É opcional ao registrar fusões e conexões.',
  },
  {
    key: 'situacao',
    term: 'Situação',
    short: 'Em que fase está o elemento: planejado, instalado, ativo, danificado ou desativado.',
    long: 'Planejado ainda não existe na rua; instalado está lá mas sem uso; ativo está funcionando; danificado precisa de reparo; desativado saiu de uso. Clientes têm ativo, bloqueado ou cancelado.',
  },
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function glossaryTerm(key: string): GlossaryTerm | undefined {
  return GLOSSARY.find((term) => term.key === key);
}

/** Busca sem acento e sem diferenciar maiúsculas; achados no nome do termo vêm primeiro. */
export function searchGlossary(query: string): GlossaryTerm[] {
  const q = normalize(query);
  if (!q) return [...GLOSSARY];
  const inTerm: GlossaryTerm[] = [];
  const inText: GlossaryTerm[] = [];
  for (const term of GLOSSARY) {
    if (normalize(term.term).includes(q)) inTerm.push(term);
    else if (normalize(`${term.short} ${term.long}`).includes(q)) inText.push(term);
  }
  return [...inTerm, ...inText];
}
