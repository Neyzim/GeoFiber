# Roteiro do teste com um técnico

Objetivo: ver onde o GeoFiber ajuda e onde atrapalha quem documenta a rede no dia a dia. O teste dura
de 40 a 60 minutos. O que importa é **o que o técnico faz**, não o que ele diz que faria.

## Antes de começar

- Prepare uma rede de exemplo com: 1 OLT com portas PON, 2 ou 3 caixas (1 CEO e 2 CTOs), cabos entre
  elas com tubos e fibras, algumas fusões e 1 ou 2 clientes. Tenha também um KMZ pequeno à mão.
- Crie um usuário para o técnico e teste o login antes.
- Faça as tarefas no computador e, se der, repita duas ou três no celular dele.
- Se possível, grave a tela (com a autorização dele) ou tenha alguém anotando.

## Como conduzir

- Explique só o objetivo: "Quero ver se isso serve para o seu trabalho. Quem está sendo testado é o
  sistema, não você."
- **Não explique a tela antes.** Leia a tarefa e deixe ele tentar sozinho.
- Peça para ele **pensar em voz alta** ("estou procurando onde…").
- Se ele travar, espere uns 30 segundos. Depois pergunte "O que você esperava encontrar?" antes de
  ajudar. Anote que precisou de ajuda.
- Não defenda o sistema. Se ele criticar, pergunte "Como você faria?".

## Tarefas

Leia uma de cada vez. Para cada uma, anote: se conseguiu, quanto tempo levou, onde hesitou e o que disse.

1. **Achar uma caixa.** "Encontre a CTO-02 no mapa e me diga quantas portas dela estão livres."
   Observe: se ele usa a busca ou procura no mapa; se entende o "ocupado/total".
2. **Traçar um cabo.** "Lance um cabo de distribuição da CEO até a CTO-02."
   Observe: se acha "Traçar cabo"; se percebe que clicar na caixa prende a ponta; se descobre o duplo
   clique para terminar.
3. **Montar o cabo.** "Crie os tubos e as fibras desse cabo (12 fibras)."
   Observe: se entende tubo e fibra pelas cores; se acha a aba Fibras.
4. **Fazer uma fusão.** "Na CEO, emende a fibra 1 do cabo que chega com a fibra 1 do cabo novo."
   Observe: se encontra o diagrama de fusões; se os dois toques para emendar parecem naturais.
5. **Ligar a OLT.** "Ligue a porta PON 1 da OLT na fibra que leva o sinal para a rede."
   Observe: se entende "Ligar fibra"; se sabe qual fibra escolher.
6. **Cadastrar um cliente.** "Cadastre um cliente perto da CTO-02 e ligue ele numa porta livre."
   Observe: se a sugestão da CTO mais próxima ajuda; se a porta "com sinal" faz sentido para ele.
7. **Rastrear.** "Na CTO-02, mostre por onde chega o sinal da porta desse cliente, até a OLT."
   Observe: se acha o rastreio na ficha da caixa; se o caminho em vermelho no mapa é claro; se ele
   procurou primeiro na ficha do cliente (hoje o rastreio não começa por lá).
8. **Manutenção.** "Se o cabo da CEO até a CTO-02 for cortado, quais clientes ficam sem sinal?"
   Observe: se acha o impacto; se a lista por caixa responde à pergunta.
9. **Importar (se der tempo).** "Importe este KMZ."
   Observe: se entende os grupos e a escolha do tipo; o que ele acha dos duplicados.

No celular, repita as tarefas 1, 4 e 7: a gaveta arrastável, os toques e o tamanho dos botões.

## Perguntas no fim

- O que foi mais fácil? E o que foi mais difícil?
- Faltou alguma coisa que você usa todo dia para documentar a rede?
- Hoje você documenta como (planilha, OZMap, papel)? O que o GeoFiber faz melhor ou pior?
- Você usaria no campo, pelo celular? Para quê?
- Alguma palavra da tela que você chamaria de outro jeito?
- De 0 a 10, quanto você recomendaria para um colega? Por quê?

## Anotações

| Tarefa | Conseguiu? (sim / com ajuda / não) | Tempo | Onde hesitou / o que disse |
|---|---|---|---|
| 1. Achar uma caixa | | | |
| 2. Traçar um cabo | | | |
| 3. Montar o cabo | | | |
| 4. Fazer uma fusão | | | |
| 5. Ligar a OLT | | | |
| 6. Cadastrar um cliente | | | |
| 7. Rastrear | | | |
| 8. Manutenção | | | |
| 9. Importar | | | |

## Depois do teste

Junte as anotações numa lista curta: o que **travou** o técnico (corrigir primeiro), o que **atrasou**
e o que ele **pediu**. Essa lista vira a próxima rodada de ajustes.
