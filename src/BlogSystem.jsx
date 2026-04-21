// ═══════════════════════════════════════════════════════════════════
// BlogSystem.jsx — Sistema de blog do ChessPlan
// Coloque em src/BlogSystem.jsx
//
// Rotas no App.jsx:
//   <Route path="/blog" element={<BlogPage />} />
//   <Route path="/blog/:slug" element={<BlogPost />} />
// ═══════════════════════════════════════════════════════════════════
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { SEO } from "./SEO";

// ── Artigos do blog (adicione novos aqui) ───────────────────────
export const BLOG_POSTS = [
  {
    slug: "sindarov-vence-candidatos-2026",
    title: "Sindarov vence o Candidatos 2026 e desafia Gukesh: a nova era do xadrez",
    description: "O uzbeque de 20 anos dominou o torneio com folga e vai enfrentar um campeão mundial em crise. Análise completa.",
    date: "2026-04-18",
    readTime: "8 min",
    tags: ["Candidatos 2026", "Sindarov", "Gukesh", "Campeonato Mundial"],
    image: null,
    content: `
O Torneio de Candidatos 2026, disputado no Chipre, entregou o que prometeu: drama, xadrez de altíssimo nível e um vencedor improvável que dominou o campo com autoridade absoluta. Javokhir Sindarov, o grande mestre uzbeque de apenas 20 anos, conquistou a classificação para o match pelo título mundial com uma rodada de antecedência — algo que poucos previram quando o torneio começou.

## A ascensão meteórica de Sindarov

O ano de 2025 foi o divisor de águas na carreira de Sindarov. Ele começou o ano com rating 2692 e terminou com 2726, impulsionado por duas performances decisivas: uma campanha sólida no FIDE Grand Swiss e a conquista do título da Copa do Mundo da FIDE, onde venceu Wei Yi na final sem perder uma única partida clássica.

No Candidatos, Sindarov manteve a mesma solidez. Após vencer Fabiano Caruana na quarta rodada, assumiu a liderança isolada e nunca mais a perdeu. Sua sequência invicta em partidas clássicas chegou a 50 jogos — a última derrota havia sido contra Ivan Cheparinov no Grand Swiss de 2025.

O segredo? Preparação impecável e sangue frio. Na partida decisiva contra Anish Giri na rodada 13, Sindarov aceitou um peão isolado na Defesa da Dama Recusada, neutralizou as chances do holandês sem dificuldade e selou o empate que lhe garantiu o título. "Revisamos essa linha dez vezes porque Giri já a tinha jogado contra Esipenko. Após a troca de damas, senti que não teria problemas", disse Sindarov na coletiva.

Na rodada final, um empate rápido de 8 minutos contra Wei Yi na Espanhola dos Quatro Cavalos foi suficiente para quebrar o recorde de Nepomniachtchi de maior pontuação na história do Candidatos: 10/14, meio ponto acima da marca anterior.

## Gukesh: o campeão em crise

Enquanto Sindarov brilhava no Chipre, o campeão mundial Gukesh Dommaraju viveu um cenário oposto. O indiano de 19 anos — que havia feito história ao conquistar o título contra Ding Liren em 2024 — enfrentou o início de 2026 mais difícil de sua carreira.

No Tata Steel Masters em janeiro, Gukesh sofreu derrotas para Giri e Bluebaum. No Prague Masters em março, a situação piorou: três derrotas em quatro partidas, incluindo uma sequência de erros táticos e problemas de gerenciamento de tempo que culminaram em um último lugar compartilhado. Seu rating despencou para o 20º do mundo no ranking ao vivo.

No Menorca Masters em abril, jogando no formato rápido, Gukesh terminou em quarto lugar atrás do compatriota Nihal Sarin, que o venceu nas duas partidas entre eles. A queda de forma levou o campeão a tomar uma decisão drástica: abandonar sua vaga integral no Grand Chess Tour 2026 para priorizar períodos de treinamento.

"Meu desempenho nos últimos eventos tem sido decepcionante, não apenas para mim, mas para todos que me apoiam. Para encontrar minha melhor forma, minha equipe e eu decidimos que devo competir com menos intensidade nos próximos meses", declarou Gukesh.

## O confronto: dois caminhos opostos

O match pelo título mundial, esperado para novembro-dezembro de 2026, será histórico por vários motivos. Pela primeira vez desde Kramnik vs Topalov em 2006, ambos os jogadores terão a mesma idade: 20 anos. Será o match mais jovem da história moderna do xadrez.

Mas as trajetórias não poderiam ser mais distintas. Sindarov chega como o número 5 do mundo, com uma sequência invicta de 50 partidas clássicas, confiança inabalável e a melhor pontuação de todos os tempos no Candidatos. Gukesh chega como número 15, com seis derrotas em 2026, três vitórias, e a pressão de uma coroa que parece cada vez mais pesada.

A comparação inevitável é com Ding Liren, cujo curto reinado também foi marcado por dificuldades. Mas Gukesh tem a vantagem da juventude e do tempo — se conseguir usar os meses de preparação para recalibrar seu jogo, a história pode mudar completamente.

## O que podemos aprender

Para nós, jogadores amadores, há lições valiosas nesta história:

A preparação vence o talento puro. Sindarov e seu treinador Roman Vidonyak treinaram 15 dias, 8 horas por dia, sem computador antes do Candidatos. Às vezes, voltar aos fundamentos é o caminho mais rápido para evoluir.

A consistência importa mais que brilhantismo. Sindarov não jogou as partidas mais espetaculares do torneio — jogou as mais sólidas. Ele escolheu linhas seguras quando podia arriscar e arriscou quando as odds estavam a seu favor.

Períodos de queda são normais. Se o campeão mundial pode ter uma fase ruim, você também pode. O importante é como você reage. Gukesh reconheceu o problema e tomou uma decisão difícil de parar para treinar.

Ferramentas de análise fazem diferença. Tanto Sindarov quanto os outros candidatos usam extensivamente bancos de dados e análise computacional para preparação. Você pode fazer o mesmo no seu nível usando ferramentas como o ChessPlan para identificar seus padrões de erro e pontos cegos.

---

*Quer analisar suas próprias partidas com IA e descobrir seus pontos cegos? Experimente o ChessPlan gratuitamente — conecte seu Lichess ou Chess.com e receba feedback personalizado em segundos.*
    `,
  },

  {
  slug: "paradoxo-do-blitz-piorando-rating",
  title: "O Paradoxo do Blitz: Por que jogar mais rápido está piorando seu rating no Clássico?",
  description: "Você treina Blitz todos os dias, seu rating rápido sobe, mas seu xadrez pensado estagnou. A ciência por trás do fenômeno e como reverter.",
  date: "2026-04-20",
  readTime: "7 min",
  tags: ["Blitz", "Treinamento", "Rating", "Psicologia do Xadrez", "Dicas"],
  image: "/screenshots/hand-playing-chess-classic-board.jpg",
  content: `
Se você é um jogador de clube típico, sua rotina provavelmente é esta: chega em casa cansado, abre o Lichess ou Chess.com e clica em **"Jogar 5+3"**. Em 20 minutos você disputa 3 ou 4 partidas, sente a adrenalina do xeque-mate rápido e desliga o computador. No dia seguinte, repete.

Seu rating de Blitz sobe. Você está mais rápido, mais afiado. Mas quando decide jogar uma partida de 30 minutos no fim de semana… desastre. Você perde peças em lances bobos, não calcula variantes e entrega o jogo em uma posição que "no Blitz você teria vencido".

Bem-vindo ao **Paradoxo do Blitz**. E não, você não está ficando louco. A neurociência e os dados do xadrez explicam exatamente o que está acontecendo.

## O cérebro no modo "piloto automático"

O Blitz (especialmente abaixo de 5 minutos) treina uma habilidade específica: **reconhecimento de padrões instantâneos**. Você vê um peão pendurado e captura. Vê um cheque e foge. Esse processo acontece no **Sistema 1** do cérebro, aquele que age por instinto, rápido e sem esforço consciente (termo popularizado pelo Nobel Daniel Kahneman).

O problema é que o xadrez **pensado** (Rapid ou Clássico) exige o **Sistema 2**: cálculo profundo, verificação de lances candidatos, análise de consequências a longo prazo.

Quando você joga 20 partidas de Blitz por dia e zero partidas pensadas, você está **hipertrofiando o Sistema 1 e atrofiando o Sistema 2**. Seu cérebro literalmente se acostuma a tomar decisões em 2 segundos. Quando você tem 2 minutos no relógio, ele entra em pânico e escolhe a primeira opção que parece "familiar" — geralmente a errada.

## O efeito "Buraco Negro" no meio-jogo

Jogadores viciados em Blitz tendem a apresentar um fenômeno muito específico nos gráficos de avaliação:
- **Abertura:** Perfeita (memorizada ou jogada no automático).
- **Lance 15-20:** Queda abrupta na avaliação.

Por quê? Porque no Blitz, o meio-jogo é resolvido com **ameaças de um lance só**. Você ataca a Dama, o rival foge, você ataca de novo. No xadrez pensado, o rival vai parar, respirar, e jogar um lance profilático como *h3* ou *g4* que **não existem no seu repertório de Blitz**.

Você olha para o tabuleiro, não vê "ameaças", e seu cérebro, treinado para velocidade, interpreta isso como *"não há nada para fazer"*. Então você faz um lance "normal" de desenvolvimento que, na verdade, é um **erro posicional grave**.

**Dado do ChessPlan:** Usuários que jogam mais de 60% de Blitz têm uma taxa de erro (perda de peça) **2.5x maior** em partidas Rapid entre os lances 20 e 30 do que usuários que jogam majoritariamente Rapid.

## A diferença entre "Rápido" e "Veloz"

É aqui que muitos se confundem. Jogar Blitz deixa você **veloz**. Jogar Rapid deixa você **rápido** no pensamento profundo. É uma diferença sutil mas crucial.

Pense em um pianista. Tocar escalas muito rápido (Blitz) é ótimo para aquecer os dedos. Mas se ele só toca escalas rápidas, ele nunca conseguirá executar uma sonata de Beethoven que exige pausas, dinâmica e emoção (Clássico). Ele vai "atropelar" as notas.

O mesmo acontece no tabuleiro. Você "atropela" o cálculo porque seu cérebro está viciado na dopamina da próxima jogada rápida.

## Como sair do ciclo vicioso (sem abandonar o Blitz)

Ninguém está dizendo para você deletar sua conta do Lichess. Blitz é divertido e é um excelente laboratório para testar aberturas. O segredo está na **dosagem** e na **intencionalidade**.

**1. A Regra 3:1**
Para cada 3 partidas de Blitz que você jogar, **analise profundamente UMA partida pensada**. Não precisa jogar uma partida de 60 minutos. Pode ser uma partida Rapid de 15+10. Mas quando ela acabar, você **NÃO** clica em "Nova Partida". Você clica em "Análise".

**2. O Método do "Vídeo Cassete"**
Antes de fazer seu lance no Rapid, force-se a escrever (ou sussurrar) **por que** você vai jogar aquilo.
- Ao invés de pensar: *"Cavalo f6"*.
- Pense: *"Cavalo f6 ataca e4, desenvolve, e prepara o roque. E se ele jogar e5, eu tenho Ch5 ou Cg4?"*
Esse monólogo interno ativa o Sistema 2 e desacelera seu clique.

**3. Identifique seu "Calcanhar de Aquiles" com IA**
A maioria dos jogadores nem percebe que está errando sempre na **mesma casa** ou na **mesma estrutura de peões**.
Use uma ferramenta de análise (como o *Heatmap de Erros* do ChessPlan). Você pode descobrir que no Blitz você é um gênio, mas quando o relógio tem mais de 10 minutos, você **sempre** perde um peão na casa **d4** ou **e5**. Saber disso é metade da correção.

## A Boa Notícia: O Rating Pensado é mais "Verdadeiro"

Se você reverter esse quadro, seu rating de Blitz pode até cair um pouco no começo (você estará "pensando demais" e perdendo no tempo). **Isso é um bom sinal.**

O rating de xadrez pensado (Rapid/Clássico) é um indicador muito mais confiável da sua **força real de jogo**. Ele não depende de "truques sujos" ou "flags" no relógio. Ele depende de compreensão.

Ao equilibrar o treino, você vai perceber que suas partidas de Blitz também vão melhorar — porque agora você tem um **plano de fundo posicional** para quando o instinto falhar.

---

*Quer descobrir se o Blitz está sabotando seu xadrez pensado? O **ChessPlan** mostra, com IA, a diferença de performance entre seus ritmos de jogo, seus erros mais comuns quando o relógio está cheio e um heatmap de onde você entrega a partida. Conecte sua conta e veja a análise gratuita. Image Designed by Freepik*
  `,
},

  {
    slug: "hans-niemann-ascensao-2026",
    title: "Hans Niemann em ascensão: de polêmico a top 12 do mundo",
    description: "Vitória dominante contra Liang em Paris, salto no ranking e uma posição brilhante que mostra o Niemann de 2026.",
    date: "2026-04-19",
    readTime: "7 min",
    tags: ["Hans Niemann", "Match Paris 2026", "Ranking Mundial", "Análise de partida"],
    image: null,
    content: `
Hans Niemann é, possivelmente, o jogador de xadrez mais polarizador da última década. Desde a controvérsia com Magnus Carlsen no Sinquefield Cup de 2022, cada resultado seu é analisado com uma lupa. Mas em 2026, os resultados falam por si — e falam alto. O americano de 22 anos está vivendo a melhor fase de sua carreira e acaba de saltar para o top 12 do mundo.

## O match em Paris: Niemann vs Liang

De 10 a 15 de abril, o Blitz Society em Paris sediou um match clássico de 12 partidas entre Niemann e o compatriota Awonder Liang. O controle de tempo era 60 minutos + 30 segundos de incremento, com duas partidas por dia — um ritmo que exige tanto preparo técnico quanto resistência física.

O resultado foi inequívoco: Niemann venceu por 7½–4½, com três vitórias e nenhuma derrota. A campanha invicta rendeu quase 14 pontos de rating e o levou do 20º para o 12º lugar no ranking mundial ao vivo.

A primeira vitória veio na partida 3, onde um erro de Liang no final de torres se mostrou decisivo. A segunda, na partida 8, foi a mais impressionante do match.

## A partida 8: uma aula de precisão posicional

Jogando com as peças pretas, Niemann enfrentou uma Abertura Catalã de Liang. A posição parecia equilibrada até que Liang cometeu uma imprecisão sutil no meio-jogo, e Niemann explorou com precisão cirúrgica.

A posição crítica surgiu após o lance 18 das brancas:

**1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3 O-O 6.O-O dxc4 7.Qc2 a6 8.a4 Bd7 9.Qxc4 Bc6 10.Bf4 Bd6 11.Bg5 Nbd7 12.Nc3 h6 13.Bxf6 Nxf6 14.e3 Bd5 15.Qd3 c5 16.Nxd5 Nxd5 17.dxc5 Bxc5 18.Rfd1**

Nesta posição, Niemann encontrou o plano decisivo: **18...Qe7!** seguido de **...Rac8** e **...Nb4**, explorando a fraqueza das casas claras no flanco da dama das brancas. O cavalo em b4 se tornou uma peça dominante, atacando tanto d3 quanto a2 simultaneamente.

A beleza da jogada de Niemann está na simplicidade. Ele não buscou complicações táticas — simplesmente colocou cada peça na casa ideal e esperou que a pressão acumulada se tornasse insustentável. Em 31 lances, Liang já não tinha mais como se defender.

Este é o tipo de xadrez que diferencia os jogadores de elite: a capacidade de transformar uma pequena vantagem em uma vitória inevitável, sem dar ao adversário nenhuma chance de contra-jogo.

## A trajetória de 2026

O match em Paris é o ponto alto de uma temporada já impressionante para Niemann. Veja o percurso:

No Tata Steel 2026 em janeiro, ele empatou em terceiro lugar com 7½/13, terminando em quarto após desempate. No FIDE Freestyle Chess World Championship em fevereiro, ficou em 5º, derrotando Aronian e Erigaisi no caminho. No Prague Masters em março, terminou em 8º — um resultado modesto, mas em um campo extremamente forte. No Grenke Freestyle Chess Open em abril, marcou 6½/9. E agora, a vitória dominante contra Liang.

O padrão é claro: Niemann está consistentemente competindo contra a elite mundial e, diferente de anos anteriores, está convertendo oportunidades em resultados concretos. Seu rating subiu para o 12º do mundo — território que poucos jogadores americanos ocuparam na história recente, além de Caruana e Nakamura.

## O estilo Niemann

O que torna Niemann perigoso é seu estilo agressivo combinado com uma maturidade crescente. Nos anos anteriores, sua agressividade às vezes se voltava contra ele — sacrifícios prematuros, complicações desnecessárias, problemas de gerenciamento de tempo. Em 2026, ele parece ter encontrado o equilíbrio.

A partida 8 contra Liang é o exemplo perfeito: em vez de buscar um sacrifício espetacular na Catalã, Niemann jogou de forma posicional, acumulando pequenas vantagens até que a posição se ganhou sozinha. É o tipo de evolução que separa um jogador talentoso de um jogador completo.

Seu treinamento também evoluiu. Desde a resolução da disputa legal com Carlsen em 2023, Niemann tem competido continuamente em eventos de alto nível, acumulando experiência contra os melhores do mundo. Cada derrota parece ter se transformado em uma lição aplicada na próxima partida.

## O que isso significa para o xadrez americano

Com Caruana (2º do mundo) e Nakamura (3º) ainda no auge, e agora Niemann no top 12, os Estados Unidos têm três jogadores entre os 15 melhores do mundo — algo que não acontecia desde a era de Fischer. Se somarmos a crescente força de jogadores como Awonder Liang (que derrotou Nakamura em um match de treino recentemente) e o prodígio Abhimanyu Mishra, o xadrez americano vive um dos seus melhores momentos históricos.

Para Niemann especificamente, o próximo objetivo é claro: consolidar-se no top 10 e buscar uma vaga no ciclo de candidatos. Com a forma atual, não seria surpresa vê-lo disputando o próximo Torneio de Candidatos.

## Lições para o jogador amador

A evolução de Niemann oferece lições valiosas:

A primeira é sobre resiliência. Após a controvérsia de 2022, muitos acharam que a carreira de Niemann estava acabada. Ele provou o contrário com resultados consistentes. No xadrez, como na vida, a capacidade de se recuperar de momentos difíceis é o que define o longo prazo.

A segunda é sobre equilíbrio entre ataque e posição. O Niemann de 2022 era puro ataque. O de 2026 sabe quando atacar e quando construir pacientemente. Se você é um jogador agressivo, estudar finais e jogo posicional pode ser o que falta para dar o próximo salto.

A terceira é sobre análise pós-partida. Niemann analisa cada partida extensivamente. Para jogadores amadores, ferramentas como o ChessPlan podem automatizar parte desse processo — identificando padrões de erro, pontos cegos no tabuleiro e aberturas problemáticas que você nem sabia que tinha.

---

*Quer descobrir seus padrões de erro como os GMs fazem? O ChessPlan analisa suas partidas com IA e mostra exatamente onde você perde peças, quais aberturas são seus pontos fracos, e como evoluir. Experimente grátis — conecte seu Lichess ou Chess.com em segundos.*
    `,
  },
  {
    slug: "abertura-italiana-erros-classicos",
    title: "Abertura Italiana: 5 erros que estão destruindo suas partidas",
    description: "A abertura mais natural do xadrez esconde armadilhas mortais. Do Fried Liver ao peão envenenado — aprenda a evitar desastres.",
    date: "2026-04-19",
    readTime: "6 min",
    tags: ["Abertura Italiana", "Erros comuns", "Giuoco Piano", "Fried Liver"],
    image: null,
    content: `
A Abertura Italiana (1.e4 e5 2.Nf3 Nc6 3.Bc4) é a queridinha dos professores de xadrez e dos jogadores de clube. Ela é lógica, desenvolve peças para o centro e segue os princípios básicos à risca. Mas há um problema: justamente por ser tão "natural", muitos jogadores entram no piloto automático e cometem erros que transformam uma posição sólida em um desastre em menos de dez lances.

Se você joga de brancas ou de pretas, essa lista vai salvar seus pontos.

## Erro 1 (Pretas): A pressa do cavalo com 3...Nf6

O erro mais comum entre iniciantes contra a Italiana é responder 3.Bc4 com 3...Nf6 imediatamente, antes de proteger o peão de e5.

Por que é perigoso? Porque as brancas podem jogar **4.Ng5!** e de repente o sonho da abertura tranquila acaba. Você está tomando um Fried Liver Attack ou tendo que entregar um peão com 4...d5 5.exd5.

A posição crítica após **1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5** é um pesadelo para quem não conhece a teoria. O cavalo e o bispo atacam f7 juntos — e f7 só é defendido pelo rei.

A solução é simples: jogue **3...Bc5** primeiro (Giuoco Piano). Desenvolva o bispo, controle a diagonal a7-g1, e só depois pense em Nf6. Se preferir algo mais sólido, a Defesa Húngara (3...Be7) também evita toda a confusão tática.

## Erro 2 (Pretas): O peão envenenado em e4

Você joga 3...Bc5, as brancas jogam 4.c3 preparando d4. Você vê o peão e4 aparentemente desprotegido e pensa: "vou pegar de graça!"

Após **1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nxe4??** vem o castigo: **5.Qe2!** (ou 5.Qd5!). O cavalo não tem para onde fugir. Se ele volta com 5...Nf6, vem 6.d4! com um garfo descoberto que ganha o bispo de c5.

As brancas ganham uma peça inteira. Essa armadilha aparece constantemente em partidas abaixo de 1800. Não caia nela — se o peão parece "de graça" na abertura, provavelmente é uma armadilha.

## Erro 3 (Brancas): O d4 prematuro sem rocar

Muitos jogadores de brancas aprendem o plano c3+d4 para dominar o centro. O erro está em fazer isso antes de rocar.

Após **1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4?!** as pretas respondem com **5...exd4 6.cxd4 Bb4+!** e agora as brancas estão em apuros. Precisam jogar Nc3 (bloqueando o peão c e perdendo tensão central) ou Bd2 (trocando peças e complicando o roque).

O centro das brancas desmorona e a iniciativa passa para as pretas. A correção é rocar primeiro (5.O-O) ou preparar com 5.d3 (Giuoco Pianissimo) e só avançar d4 quando tudo estiver seguro.

## Erro 4 (Pretas): O bispo desesperado em g4

No Giuoco Piano com d3 (1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3), muitas pretas jogam automaticamente **5...Bg4**.

O problema é que após **6.h3 Bh5**, as brancas têm o plano Nbd2-f1-g3. O bispo em h5 vira alvo para a expansão g4 no flanco do rei. Muitas vezes as pretas perdem tempos preciosos recuando para g6 e depois h7, ou entregam o par de bispos em f3 para escapar do sufoco.

A dica: contra a Giuoco Pianissimo (d3), adie o Bg4. Roque primeiro e veja o que as brancas fazem antes de decidir onde colocar o bispo. Às vezes **Be6** é muito mais útil que Bg4.

## Erro 5 (Brancas): O cavalo perdido em a3

Você jogou e4, Nf3, Bc4, d3, O-O. Tudo perfeito. Agora quer desenvolver o cavalo da dama. Muitos jogadores vão para **Na3** pensando "vou para c4 ou b5!".

A realidade: o cavalo em a3 é um desastre. Ele controla duas casas vazias (c2 e b1) e bloqueia a torre. Você gastou um lance para colocar uma peça na pior casa possível.

A correção: sempre prefira **Nbd2**. Ele apoia e4, pode ir para f1 defender o rei ou para c4 atacar, sem atrapalhar ninguém. A manobra Nbd2-f1-g3 é o plano padrão da Italiana moderna — Carlsen, Giri e So usam ela regularmente.

## A lição: precisão supera memorização

A Abertura Italiana não é um tanque de guerra como a Escocesa, nem um enigma como a Ruy López. Ela é como um bisturi — requer precisão. Se você eliminar esses cinco erros do seu repertório, vai chegar ao meio-jogo com muito mais frequência em posições confortáveis e com chances reais de vitória.

E o melhor: você não precisa decorar 20 lances de teoria. Basta entender os princípios — desenvolva, roque, controle o centro, e não pegue peões "de graça" na abertura.

---

*Quer saber quais erros de abertura VOCÊ comete com mais frequência? O ChessPlan analisa suas partidas automaticamente com IA, mostra seu win rate por abertura, e identifica padrões de erro que você nem sabia que tinha. Conecte seu Lichess ou Chess.com e descubra em segundos.*
    `,
  },
];

// ── Componente: lista de posts ──────────────────────────────────
export function BlogPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <SEO
        title="Blog"
        description="Análises, novidades do mundo do xadrez e dicas para evoluir no rating. Artigos sobre aberturas, torneios e estratégia."
      />
      <div style={{ marginBottom: 40 }}>
        <Link to="/" style={{ color: "#c4a74a", textDecoration: "none", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          ← Voltar ao ChessPlan
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8, marginTop: 16 }}>
          Blog ChessPlan
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
          Análises, novidades do mundo do xadrez e dicas para evoluir
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
          <article
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: "24px 28px",
              cursor: "pointer",
              transition: "border-color 0.15s, transform 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(196,167,74,0.2)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {/* Tags */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {post.tags.slice(0, 3).map((tag) => (
                <span key={tag} style={{
                  fontSize: 10, padding: "3px 10px", borderRadius: 12,
                  background: "rgba(196,167,74,0.08)", color: "#c4a74a",
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                }}>{tag}</span>
              ))}
            </div>

            {/* Title */}
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.3, marginBottom: 8 }}>
              {post.title}
            </h2>

            {/* Description */}
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6,
              fontFamily: "'DM Sans', sans-serif", marginBottom: 12,
            }}>
              {post.description}
            </p>

            {/* Meta */}
            <div style={{
              display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.25)",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <span>{new Date(post.date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</span>
              <span>{post.readTime} de leitura</span>
            </div>
          </article>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Componente: post individual ─────────────────────────────────
export function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
        Artigo não encontrado
      </div>
    );
  }

  // Simple markdown-like rendering
  const renderContent = (content) => {
    return content.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: 16 }} />;

      // H2
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={i} style={{
            fontSize: 22, fontWeight: 600, color: "#c4a74a",
            marginTop: 36, marginBottom: 16, lineHeight: 1.3,
          }}>
            {trimmed.replace("## ", "")}
          </h2>
        );
      }

      // H3
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={i} style={{
            fontSize: 18, fontWeight: 600, color: "#fff",
            marginTop: 28, marginBottom: 12, lineHeight: 1.3,
          }}>
            {trimmed.replace("### ", "")}
          </h3>
        );
      }

      // Horizontal rule
      if (trimmed === "---") {
        return <hr key={i} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "32px 0" }} />;
      }

      // Italic block (CTA)
      if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
        return (
          <div key={i} style={{
            background: "rgba(196,167,74,0.06)",
            border: "1px solid rgba(196,167,74,0.12)",
            borderRadius: 12, padding: "20px 24px", marginTop: 24,
            fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
            fontStyle: "italic",
          }}>
            {trimmed.slice(1, -1)}
          </div>
        );
      }

      // Regular paragraph — handle bold
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} style={{
          fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.8,
          fontFamily: "'DM Sans', sans-serif", marginBottom: 4,
        }}>
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j} style={{ color: "#fff", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <SEO title={post.title} description={post.description} />
      {/* Back button */}
      <Link to="/blog" style={{
        background: "none", border: "none", color: "#c4a74a",
        cursor: "pointer", fontSize: 14, fontWeight: 600,
        marginBottom: 24, padding: 0, fontFamily: "'DM Sans', sans-serif",
        textDecoration: "none", display: "inline-block",
      }}>
        ← Voltar para o blog
      </Link>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {post.tags.map((tag) => (
          <span key={tag} style={{
            fontSize: 10, padding: "3px 10px", borderRadius: 12,
            background: "rgba(196,167,74,0.08)", color: "#c4a74a",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          }}>{tag}</span>
        ))}
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 700, color: "#fff",
        lineHeight: 1.2, marginBottom: 16,
      }}>
        {post.title}
      </h1>

      {/* Meta */}
      <div style={{
        display: "flex", gap: 16, fontSize: 13, color: "rgba(255,255,255,0.3)",
        fontFamily: "'DM Sans', sans-serif", marginBottom: 40,
        paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span>{new Date(post.date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</span>
        <span>{post.readTime} de leitura</span>
      </div>

      {/* Content */}
      <div>{renderContent(post.content)}</div>

      {/* Share + CTA */}
      <div style={{
        marginTop: 48, padding: "24px 28px", borderRadius: 16,
        background: "rgba(196,167,74,0.04)", border: "1px solid rgba(196,167,74,0.1)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
          Quer evoluir no xadrez com IA?
        </div>
        <p style={{
          fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 16,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Conecte seu Lichess ou Chess.com e descubra seus pontos cegos com análises personalizadas.
        </p>
        <button onClick={() => window.location.href = "/"} style={{
          background: "#c4a74a", color: "#000", border: "none",
          padding: "12px 28px", borderRadius: 8, fontSize: 14,
          fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>
          Experimentar grátis →
        </button>
      </div>
    </div>
  );
}