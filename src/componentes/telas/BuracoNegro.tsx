"use client";

/**
 * O buraco negro da seção "Quem é I.V.E?".
 *
 * Tomou o lugar da galáxia (Galaxia.tsx segue no repositório, sem uso).
 * É o mesmo motor de partículas das outras telas — ver pontos.ts — e usa
 * o mesmo branco delas, de propósito: a identidade da IDEA é ponto branco
 * no escuro, e um disco em tons de fogo teria sido outra marca. O buraco
 * é preto e só; quem desenha a forma é a matéria em volta.
 *
 * Quatro coisas fazem a leitura:
 *
 * · A MATÉRIA ORBITA, e não cai. Já caiu: cada ponto perdia raio até ser
 *   engolido e renascia na borda. Ficou mais bonito sem — a órbita limpa,
 *   com o anel guardando distância da esfera, lê melhor do que o
 *   mergulho, e de quebra some o estado mutável por partícula.
 *
 * · KEPLER. A velocidade angular sai de ω ∝ r^-3/2, então o anel de
 *   dentro dá voltas enquanto o de fora mal se mexe. É lei de gravitação,
 *   não número escolhido a olho, e é o cisalhamento que faz o conjunto
 *   parecer matéria em órbita em vez de uma imagem girando.
 *
 * · A LENTE LEVANTA A METADE DE TRÁS. Sem ela não haveria imagem: com o
 *   disco quase de perfil, a borda interna projeta 0,58 raios de sombra
 *   acima do centro — DENTRO da própria sombra. Tudo sumiria atrás da
 *   esfera e sobraria uma barra cortada ao meio. É a curvatura da luz que
 *   traz a metade de trás por cima do buraco. A da frente não precisa de
 *   nada: passa na frente porque é pintada depois.
 *
 * · A LUZ SOMA. `globalCompositeOperation = "lighter"` acumula em vez de
 *   cobrir, então onde o fluxo aperta os pontos saturam sozinhos até o
 *   branco puro. É o que dá o brilho do miolo sem clarear ponto por ponto.
 */

import {
  Baldes,
  faixa,
  useTela,
  velocidadeDaRolagem,
  type Cena,
} from "./pontos";

const TAU = Math.PI * 2;

/** Inclinação do disco. 0 = de perfil, π/2 = de frente. */
const INCLINACAO = 0.34;
/** Giro no plano da tela: é o que faz a elipse subir da esquerda pra direita. */
const ROLAGEM = -0.17;

/*
 * Os raios são medidos em SOMBRAS — múltiplos do raio do horizonte. É a
 * régua natural do objeto: mudando só o tamanho da sombra em `medir`, o
 * fluxo inteiro acompanha na proporção certa.
 */
/*
 * DENTRO é onde o anel começa, e o vão entre ele e a esfera é o ponto
 * inteiro do desenho — mas tem faixa estreita de acerto, e os dois lados
 * dela foram testados na tela:
 *
 *   1,02  a matéria encostava na esfera, fundia com ela, e o conjunto
 *         virava uma mancha ovalada sem preto com borda própria.
 *   2,00  o vão abria demais e o anel ficava boiando longe, com uma
 *         faixa morta grande entre o fio branco e o primeiro ponto.
 *
 * 1,4 é onde parou: sobra pouco mais de um terço de sombra de respiro
 * depois do anel de fótons — o suficiente pro preto ter contorno próprio
 * sem o desenho se soltar em dois objetos separados.
 *
 * BORDA fechou junto (já foi 4,6). Com a mesma contagem espalhada por
 * menos raio, o anel tem corpo em vez de rarear até virar poeira. Os dois
 * andam juntos: mexer num sem o outro ou esvazia o anel ou o engorda.
 */
const DENTRO = 1.4;
const BORDA = 4.0;

/** Radianos por ms a uma sombra do centro. Kepler faz o resto. */
const GIRO_BASE = 0.0016;

const NASCER = 1600;

/** Quanto a rolagem acelera o fluxo. Ver o mesmo par em Terra.tsx. */
const PUXA_ROLAGEM = 22;
const TETO_ROLAGEM = 8;

/*
 * A lente, em raios de sombra. SOBE é o quanto a metade de trás é
 * levantada ao passar pelo eixo do buraco; ALCANCE é a largura da região
 * onde a curvatura ainda importa — longe dali a luz viaja quase reta e o
 * disco volta a ser plano, por isso as pontas seguem deitadas e só o
 * miolo arqueia.
 *
 * O levantamento cai com o raio da órbita: quem passa raspando é desviado
 * muito mais que quem passa longe. Não é a integral da geodésica, é a
 * forma dela — o suficiente pra que a borda interna, que é a mais densa,
 * apareça acima da esfera em vez de ficar escondida atrás.
 */
const SOBE = 0.95;
const ALCANCE = 2.6;

/** Doppler: o lado que vem na nossa direção brilha mais. Discreto. */
const FEIXE = 0.22;

/** O branco da casa — o mesmo das outras três telas. */
const COR = "252,251,255";

/*
 * Opacidade do balde mais forte. Como a pintura é somada, este número não
 * é o brilho final: onde o fluxo aperta, os pontos se empilham e saturam
 * sozinhos até o branco puro. Ele é o piso do empilhamento.
 */
const BRILHO = 0.68;

/** Raio do anel de fótons, em sombras. Fica rente à esfera. */
const ANEL = 1.035;

type P = {
  /** raio da órbita, em sombras. Fixo. */
  r: number;
  /** ângulo inicial */
  a: number;
  /** altura fora do plano, como fração. Vira px multiplicada por r². */
  hf: number;
  brilho: number;
  omega: number;
};

function semear(quantos: number): P[] {
  const ps: P[] = new Array(quantos);
  for (let i = 0; i < quantos; i++) {
    /*
     * O expoente puxa a população para a borda de DENTRO, que é onde o
     * anel precisa ter contorno nítido — é ela que desenha o vão em volta
     * da esfera. Uniforme daria uma faixa lavada, sem começo.
     */
    const r = DENTRO + (BORDA - DENTRO) * Math.random() ** 1.5;
    const a = Math.random() * TAU;

    /*
     * Grumos: o seno em ângulo e raio dá textura de filamento sem custar
     * ruído. Como a rotação é diferencial, eles se esticam sozinhos em
     * espiral com o tempo — que é o que matéria em órbita faz.
     */
    const grumo = 0.62 + 0.5 * Math.sin(a * 3.1 + r * 5.4);

    ps[i] = {
      r,
      a,
      hf: Math.random() - 0.5,
      omega: GIRO_BASE / (r * Math.sqrt(r)),
      brilho: Math.min(1, (0.34 + Math.random() * 0.62) * grumo),
    };
  }
  return ps;
}

export function BuracoNegro({ className }: { className?: string }) {
  const tela = useTela((): Cena => {
    let ps: P[] = [];
    /** Três faixas de brilho, cada uma um array plano [x, y, ...]. */
    let estrelas: number[][] = [[], [], []];
    let cx = 0;
    let cy = 0;
    /** Raio da sombra, em px. É a régua de tudo. */
    let rs = 0;
    let tGiro = 0;
    let anterior = 0;
    const atras = new Baldes();
    const frente = new Baldes();

    /*
     * Com `prefers-reduced-motion` o useTela pinta o quadro ZERO e para —
     * aquele é o quadro final. Só que no quadro zero a entrada ainda não
     * começou, então a cena inteira sairia transparente e sobraria a
     * esfera preta sozinha. Quem pediu menos movimento quer a imagem
     * parada, não a imagem apagada: sem laço, não há entrada pra animar.
     */
    const parado =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    return {
      medir(larg, alt) {
        cx = larg * 0.5;
        cy = alt * 0.5;
        // O anel chega a BORDA sombras: a conta deixa a ponta dele
        // encostar na borda maior da tela sem estourar.
        rs = (Math.max(larg, alt) * 0.5 * 0.94) / BORDA;
        /*
         * O teto tem que contar o DOBRO na metade de trás: cada partícula
         * de lá vira dois retângulos, o arco de cima e o de baixo. Com
         * 33 mil pontos são ~50 mil retângulos por quadro.
         *
         * Para comparar antes de mexer: a galáxia que morava aqui custava
         * ~34 mil, e esta cena já chegou a 78 mil quando esteve em 52 mil
         * pontos — foi o que pesou a página. 50 mil é o meio termo entre
         * densidade e custo; é ESTE número que se mexe se a seção voltar
         * a travar, e não o brilho.
         */
        ps = semear(Math.round(Math.max(13000, Math.min(33000, rs * 265))));

        estrelas = [[], [], []];
        const quantas = Math.round((larg * alt) / 4200);
        for (let i = 0; i < quantas; i++) {
          // O cubo deixa a maioria fraquinha e poucas de fato visíveis —
          // céu com hierarquia, em vez de sal derramado.
          const b = Math.random() ** 3;
          estrelas[b > 0.62 ? 2 : b > 0.22 ? 1 : 0].push(
            Math.random() * larg,
            Math.random() * alt,
          );
        }
      },

      quadro(ctx, t) {
        const nascendo = parado ? 1 : faixa(t, 0, NASCER);

        /*
         * O tempo do GIRO é próprio, e não o `t` do relógio: acelerar com
         * a rolagem é acelerar o tempo, e ele precisa ser ACUMULADO —
         * senão mudar o multiplicador teleportaria o anel inteiro pra
         * outro ângulo em vez de apressá-lo.
         *
         * Com o raio fixo, ω é constante por partícula e a posição volta
         * a ser `a + ω·t`: some a integração quadro a quadro, e com ela
         * a escrita em 24 mil objetos por quadro.
         */
        const dt = anterior ? Math.min(t - anterior, 64) : 16;
        anterior = t;
        const puxao = Math.max(
          -TETO_ROLAGEM,
          Math.min(TETO_ROLAGEM, velocidadeDaRolagem() * PUXA_ROLAGEM),
        );
        tGiro += dt * (1 + puxao);

        const si = Math.sin(INCLINACAO);
        const ci = Math.cos(INCLINACAO);
        const sr = Math.sin(ROLAGEM);
        const cr = Math.cos(ROLAGEM);
        const dist = 1400;

        ctx.globalCompositeOperation = "lighter";

        /* --- o céu, atrás de tudo ----------------------------------- */
        const faixas: [number, number][] = [
          [0.16, 1],
          [0.38, 1],
          [0.75, 1.7],
        ];
        for (let f = 0; f < 3; f++) {
          const [al, tam] = faixas[f];
          ctx.fillStyle = `rgba(${COR},${al * nascendo})`;
          const lista = estrelas[f];
          for (let i = 0; i < lista.length; i += 2)
            ctx.fillRect(lista[i], lista[i + 1], tam, tam);
        }

        /* --- o anel, partido em atrás e na frente -------------------- */
        atras.limpar();
        frente.limpar();

        for (const p of ps) {
          const ang = p.a + p.omega * tGiro;
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);

          const dx = ca * p.r * rs;
          const dz = sa * p.r * rs;
          // O disco AFINA conforme aperta: a altura vem de r².
          const dy = p.hf * 0.03 * p.r * p.r * rs;

          // inclina em X: é isso que achata o círculo na elipse
          const y1 = dy * ci - dz * si;
          const z1 = dy * si + dz * ci;
          const escala = dist / (dist + z1);

          /*
           * O quanto a partícula está ATRÁS: 0 nas laterais, 1 no ponto
           * mais distante.
           *
           * Este número existe por causa de um rasgo. A lente já ligou
           * por `z1 > 0`, e aquilo era um degrau: um ponto um grau atrás
           * saltava quase uma sombra pra cima e o vizinho um grau à
           * frente ficava parado, sem ninguém ocupando o meio do
           * caminho. O buraco aparecia justo nas duas pontas do disco,
           * que é onde a órbita cruza a lateral. Pesando o desvio por
           * `sa`, ele entra e sai suave e as duas metades se encontram.
           */
          const traseira = sa > 0 ? sa : 0;

          const dxs = dx / rs;
          const desvio =
            traseira > 0
              ? rs *
                (SOBE / (0.55 + p.r * 0.28)) *
                Math.exp(-(dxs * dxs) / (ALCANCE * ALCANCE)) *
                traseira
              : 0;

          // O lado que vem na nossa direção brilha mais. Discreto.
          const feixe = 1 - FEIXE * ca;
          const a = p.brilho * feixe * nascendo;
          const tam = escala > 1.02 ? 1.6 : 1.2;
          const alvo = traseira > 0 ? atras : frente;

          // A imagem principal: a metade de trás sobe por cima do buraco.
          const yCima = y1 - desvio;
          alvo.por(
            a,
            cx + (dx * cr - yCima * sr) * escala,
            cy + (dx * sr + yCima * cr) * escala,
            tam,
          );

          /*
           * A SEGUNDA IMAGEM — o arco de baixo.
           *
           * É a mesma matéria vista pelo outro lado do buraco: a luz que
           * contorna o horizonte por baixo em vez de por cima. É ela que
           * FECHA o laço em volta da esfera; sem ela sobra um arco em
           * cima e um disco embaixo, e não o anel contínuo.
           *
           * A posição é o espelho da principal, e não `y + desvio`: a
           * soma cairia dentro da própria sombra e seria engolida. Mais
           * fraca porque o caminho da luz é mais longo, e some junto com
           * o desvio nas laterais — lá ela coincidiria com a principal e
           * só empilharia ponto no mesmo lugar.
           */
          if (desvio > 0) {
            const yBaixo = -yCima;
            atras.por(
              a * 0.5 * traseira,
              cx + (dx * cr - yBaixo * sr) * escala,
              cy + (dx * sr + yBaixo * cr) * escala,
              tam,
            );
          }
        }

        atras.pintar(ctx, COR, BRILHO);

        /* --- o buraco ----------------------------------------------- */
        /*
         * Preto por dentro, e nada mais: sem miolo, sem gradiente. Ele
         * não é desenhado, é RECORTADO — o que o define é a matéria que
         * passa por cima e as estrelas que somem atrás. Opaco e pintado
         * ENTRE as duas metades do fluxo: é essa ordem que engole a
         * metade de trás e cria o mergulho.
         */
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(0,0,0,${nascendo})`;
        ctx.beginPath();
        ctx.arc(cx, cy, rs, 0, TAU);
        ctx.fill();

        /* --- o anel de fótons --------------------------------------- */
        /*
         * Um fio branco em volta da esfera inteira — a luz que orbitou o
         * buraco antes de escapar.
         *
         * É CIRCULAR, e não elíptico como o disco: a curvatura desfaz a
         * inclinação, e é justamente o contraste entre um anel redondo e
         * uma elipse deitada que denuncia gravidade em vez de desenho.
         *
         * Três passadas de espessura decrescente: a larga e fraca é o
         * halo, a fina e forte é o fio. Uma linha só de 1px sairia dura
         * demais no meio de um campo de pontos.
         */
        ctx.globalCompositeOperation = "lighter";
        for (const [largura, al] of [
          [5, 0.08],
          [1.8, 0.34],
          [0.9, 0.66],
        ] as [number, number][]) {
          ctx.lineWidth = largura;
          ctx.strokeStyle = `rgba(${COR},${al * nascendo})`;
          ctx.beginPath();
          ctx.arc(cx, cy, rs * ANEL, 0, TAU);
          ctx.stroke();
        }

        /* --- e o que passa na frente -------------------------------- */
        frente.pintar(ctx, COR, BRILHO);

        // Devolve o estado: o ctx é o mesmo entre quadros.
        ctx.globalCompositeOperation = "source-over";
      },
    };
  });

  return <canvas ref={tela} className={`tela ${className ?? ""}`} />;
}
