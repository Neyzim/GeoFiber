# Ajustes finais antes do teste com técnico (design curto)

- **Data:** 2026-11-22
- **Por quê:** o dono vai mostrar o GeoFiber a um técnico para ouvir a opinião dele sobre a usabilidade.
  Antes disso, corrigir as pendências que um técnico notaria (perder trabalho, ver dado errado, sentir
  lentidão) e preparar um roteiro para a conversa. Nenhuma funcionalidade nova.
- **Não-objetivos:** rollback de arrasto fora de ordem, a legenda editar clientes (é de propósito) e
  os modelos "CEO 24 emendas" sem `trayCapacity` (basta recriar o modelo). Esses ficam como pendências.
- **Anti-objetivo:** um ajuste mudar o fluxo que o dono já aprovou no navegador.

## Abordagens

1. **A + B (escolhida pelo dono):** corrigir as 4 pendências que perdem trabalho ou mostram dado
   errado (A) e as 2 que causam lentidão ou estranheza (B); C fica anotado.
2. Corrigir só A: mais rápido, mas o lote de portas PON sem progresso passa a impressão de que travou
   justamente no teste.
3. Corrigir tudo (A + B + C): o C não aparece num teste curto e o rollback fora de ordem mexe no
   repositório do mapa, que vai ser trocado na Etapa B.

## Ajustes

**A1. "Escolher no mapa" não perde a lista.** Hoje, durante a escolha (`sheet.picking()`), um clique
em outro cabo passa por `onPathClick` → `focusCable`, troca a seleção e descarta o rascunho. Novo
comportamento: enquanto escolhe, o clique num cabo é ignorado e aparece o aviso
"Salve ou cancele a lista antes de abrir outro cabo." (Minha escolha: aviso em vez de diálogo de
confirmação, porque é mais leve e o técnico não perde nada.)

**A2. Tipo da caixa atualizado na ficha.** Depois de salvar "Editar dados" de uma caixa, se a ficha
dessa caixa estiver aberta, ela recarrega (`BoxSheetStore`), e o tipo, as abas e o restante já
aparecem certos sem selecionar de novo.

**A3. Trocar a ponta limpa a fibra que deixou de estar livre.** No `fiber-link-dialog`, quando a
ponta (A/B) de uma linha muda e a fibra escolhida não está mais nas opções dessa ponta, a escolha
volta a ficar vazia. A fibra que já estava ligada (`slot.current`) continua valendo.

**A4. Sem vértice duplicado no duplo clique.** Hoje `appendPoint` só ignora um ponto idêntico ao
anterior, e os dois cliques do duplo clique raramente caem no mesmo lugar. Novo comportamento: um
ponto a poucos pixels de tela do vértice anterior conta como o mesmo ponto (só completa o encaixe,
como hoje). A tolerância fica com o construtor, em pixels para valer em qualquer zoom (sugestão: 6 px).

**B1. Progresso ao criar portas PON em lote.** Em `OltSheetStore.addPorts`, mostrar
"Criando porta X de N…" enquanto cria. Continua parando na primeira falha e recarregando.

**B2. Reclicar o cabo em "Mover cabo".** Em `onPathClick` com a ferramenta `editCable`, um clique no
cabo que já está selecionado não faz nada (hoje seleciona de novo e busca as pontas outra vez).

Cada ajuste vem com teste antes (TDD). A página do mapa não tem spec porque o Leaflet não roda no
jsdom: as regras de A1, A4 e B2 vão para funções puras testáveis sempre que der; o resto se confere no
navegador.

## Roteiro do teste com o técnico

`docs/ROTEIRO-TESTE-USABILIDADE.md`, em pt-BR simples, para o dono usar na conversa:

- como conduzir: o técnico mexe, o dono não explica a tela antes e anota onde ele hesita;
- de 6 a 8 tarefas reais (achar uma caixa, cadastrar um cabo, abrir a ficha da caixa, fazer uma
  fusão, ligar uma porta PON, cadastrar um cliente, rastrear uma fibra, ver o impacto de manutenção,
  importar um KMZ), cada uma com o que observar;
- perguntas no fim (o que faltou, o que demorou, o que usaria no campo pelo celular);
- uma tabela curta para anotar as respostas.

## Documentação

`docs/SPECS.md` (regras afetadas), `docs/GUIA.md` (o aviso de A1 e o progresso de B1), `README.md` (o
link do roteiro) e `CLAUDE.md` (situação: as etapas conferidas no navegador e aprovadas, as pendências
de A e B fechadas e as de C mantidas).
