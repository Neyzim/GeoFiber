/**
 * Tradução dos `detail` devolvidos pelo backend (sempre em inglês) para português.
 * Fonte dos textos: `geofiber-backend/docs/SPECS.md` e `API.md`.
 */
interface DetailTranslation {
  pattern: RegExp;
  message: (match: RegExpMatchArray) => string;
}

const FIBER_STATUS_LABELS: Record<string, string> = {
  BROKEN: 'rompida',
  RESERVED: 'reservada',
};

function fixed(pattern: RegExp, message: string): DetailTranslation {
  return { pattern, message: () => message };
}

const TRANSLATIONS: readonly DetailTranslation[] = [
  // Ligações e pontas de fibra
  fixed(
    /^Cable is not attached to this box$/,
    'O cabo desta fibra não passa por esta caixa. Adicione a caixa na lista de elementos do cabo.',
  ),
  fixed(
    /^Cable is not attached to this OLT$/,
    'O cabo desta fibra não passa por esta OLT. Adicione a OLT na lista de elementos do cabo.',
  ),
  {
    pattern: /^Fiber end (A|B) is not available$/,
    message: (m) => `A ponta ${m[1]} da fibra já está ligada a outra porta, fusão ou conexão.`,
  },
  {
    pattern: /^Fiber is (BROKEN|RESERVED) and cannot be connected$/,
    message: (m) => `A fibra está ${FIBER_STATUS_LABELS[m[1]]} e não pode ser ligada.`,
  },
  fixed(/^Fiber is connected$/, 'A fibra está ligada. Desfaça as ligações antes de continuar.'),
  fixed(
    /^Cable still has fibers connected at a detached element$/,
    'O cabo ainda tem fibras ligadas no elemento que você tentou remover.',
  ),
  fixed(
    /^Splitter port already feeds a service port$/,
    'Esta saída do splitter já alimenta uma porta de atendimento.',
  ),
  fixed(/^Splitter port already feeds a fiber$/, 'Esta saída do splitter já está ligada a uma fibra.'),
  fixed(
    /^Service port has no optical source$/,
    'A porta de atendimento não tem sinal (nem splitter nem fibra ligados).',
  ),
  fixed(
    /^Service port is not available$/,
    'A porta de atendimento está ocupada, reservada ou com defeito.',
  ),
  fixed(/^Service port is serving a customer$/, 'A porta de atendimento está atendendo um cliente.'),
  fixed(
    /^A cancelled customer cannot use a service port$/,
    'Um cliente cancelado não pode ocupar uma porta. Reative o cliente primeiro.',
  ),
  { pattern: /^Tray (\d+) is full$/, message: (m) => `A bandeja ${m[1]} está cheia.` },
  {
    pattern: /^Position (\d+) is already occupied in this tray$/,
    message: (m) => `A posição ${m[1]} desta bandeja já está ocupada.`,
  },
  {
    pattern: /^Position (\d+) exceeds tray capacity of (\d+)$/,
    message: (m) => `A posição ${m[1]} não existe: a bandeja tem ${m[2]} posições.`,
  },
  fixed(
    /^Import has elements that already exist$/,
    'Alguns itens já existem na rede (alguém importou antes?). Conferimos de novo: revise e importe outra vez.',
  ),
  fixed(
    /^Import exceeds 10000 items$/,
    'O arquivo tem itens demais para uma importação (máximo 10.000). Divida o arquivo.',
  ),
  fixed(
    /^Cable has connected fibers and cannot be reshaped$/,
    'Um cabo com fibras ligadas não pode ter o traçado trocado. Deixe-o como está.',
  ),
  fixed(
    /^Fusions are removed through the splice endpoint$/,
    'Fusões são removidas pela lista de fusões da bandeja.',
  ),
  fixed(
    /^Box has service ports and must remain a CTO$/,
    'A caixa tem portas de atendimento e precisa continuar sendo CTO.',
  ),

  // Exclusões bloqueadas por dependências
  fixed(/^Cable still has tubes$/, 'O cabo ainda tem tubos. Exclua os tubos primeiro.'),
  fixed(/^Tube still has fibers$/, 'O tubo ainda tem fibras. Exclua as fibras primeiro.'),
  fixed(/^Tray still has splices$/, 'A bandeja ainda tem fusões.'),
  fixed(/^Splitter still has connections$/, 'O splitter ainda tem ligações (fibra ou cliente).'),
  fixed(
    /^Box still has splitters, trays, service ports, connections or attached cables$/,
    'A caixa ainda tem splitters, bandejas, portas, conexões ou cabos. Remova-os primeiro.',
  ),
  fixed(
    /^OLT still has ports or attached cables$/,
    'A OLT ainda tem portas ou cabos. Remova-os primeiro.',
  ),
  fixed(/^OLT port is connected$/, 'A porta PON está ligada a uma fibra.'),
  // Unicidade (mensagens de `ConstraintMessages` no backend)
  fixed(
    /^A customer with this contract code already exists$/,
    'Já existe um cliente com este código de contrato.',
  ),
  fixed(
    /^A fiber with this absolute number already exists in the cable$/,
    'Já existe uma fibra com este número no cabo.',
  ),
  fixed(
    /^An OLT port already exists at this slot and port number$/,
    'Já existe uma porta PON neste slot e número.',
  ),
  fixed(
    /^This tray position is already used by another splice$/,
    'Esta posição da bandeja já está ocupada por outra fusão.',
  ),
  fixed(/^Element is already attached to this cable$/, 'Este elemento já está na lista do cabo.'),
  fixed(/^A .+ with this number already exists.*$/, 'Já existe um item com este número aqui.'),

  // Regras de entrada (400)
  {
    pattern: /^Tube capacities exceed the cable fiber capacity of (\d+)$/,
    message: (m) => `A soma dos tubos ultrapassa a capacidade do cabo (${m[1]} fibras).`,
  },
  fixed(
    /^Fiber number exceeds its cable or tube capacity$/,
    'O número da fibra ultrapassa a capacidade do tubo ou do cabo.',
  ),
  {
    pattern: /^Box supports at most (\d+) trays$/,
    message: (m) => `Esta caixa suporta no máximo ${m[1]} bandejas.`,
  },
  {
    pattern: /^Box supports at most (\d+) service ports$/,
    message: (m) => `Esta caixa suporta no máximo ${m[1]} portas de atendimento.`,
  },
  fixed(
    /^Input and output fibers must be different$/,
    'A fusão precisa ligar duas fibras diferentes.',
  ),
  fixed(
    /^A connection must join two different fibers$/,
    'A conexão precisa ligar duas fibras diferentes.',
  ),
  fixed(/^Splitter ratio cannot be changed$/, 'A razão do splitter não pode ser alterada.'),
  fixed(/^Only CTO boxes have service ports$/, 'Só CTOs têm portas de atendimento.'),
  fixed(
    /^A service port takes either a splitter port or a fiber, not both$/,
    'A porta de atendimento recebe sinal de um splitter ou de uma fibra, não dos dois.',
  ),
  fixed(
    /^Splitter port must be an output of a splitter in this box$/,
    'Escolha uma saída de splitter desta mesma caixa.',
  ),
  fixed(
    /^OCCUPIED is set automatically by connections$/,
    '"Ocupada" é definido automaticamente pelas ligações.',
  ),
  fixed(
    /^Cable fiber capacity is below the total capacity of its tubes$/,
    'A capacidade do cabo não pode ficar abaixo da soma dos tubos.',
  ),
  fixed(
    /^Tube capacity is below its highest fiber number$/,
    'A capacidade do tubo não pode ficar abaixo da maior fibra cadastrada.',
  ),
  fixed(
    /^Box has trays numbered above the new tray capacity$/,
    'Existem bandejas com número acima da nova capacidade.',
  ),
  fixed(
    /^Tray capacity is below its highest used position$/,
    'A capacidade da bandeja não pode ficar abaixo da maior posição usada.',
  ),
  fixed(
    /^A cable needs a START and an END element$/,
    'O cabo precisa de um elemento de início e um de fim.',
  ),
  fixed(
    /^Attachments must be START, then PASS_THROUGH elements, then END$/,
    'A lista deve ter o início, depois as passagens e por último o fim.',
  ),
  fixed(
    /^Each attachment must reference exactly one of boxId or oltId$/,
    'Cada elemento do cabo deve ser uma caixa ou uma OLT.',
  ),
  fixed(
    /^An element can appear only once in the cable$/,
    'Um elemento só pode aparecer uma vez no cabo.',
  ),
];

/** Traduz um `detail` conhecido do backend; devolve `null` quando o texto é desconhecido. */
export function translateDetail(detail: string): string | null {
  const text = detail.trim();
  for (const translation of TRANSLATIONS) {
    const match = text.match(translation.pattern);
    if (match) {
      return translation.message(match);
    }
  }
  return null;
}
