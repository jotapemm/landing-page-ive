"use client";

/**
 * A Terra.
 *
 * Uma esfera de pontos onde cada ponto sabe se caiu em terra firme ou no
 * mar — terra brilha, água fica quase apagada. É o mesmo motor da esfera do
 * hero, só que a semeadura consulta a máscara de `src/dados/terra.ts`
 * (gerada por `npm run terra`; ver os comentários do script para o porquê).
 *
 * O que faz ela parecer sólida, e não uma nuvem de pontos:
 *
 *   · o hemisfério de trás é DESCARTADO — planeta é opaco;
 *   · perspectiva de verdade (os pontos do meio vêm mais perto e maiores);
 *   · sombreado por ângulo com a luz, que escurece o limbo;
 *   · o eixo é inclinado nos 23,4° reais e a rotação é em torno dele.
 *
 * Arrastar com o mouse gira e solta com inércia.
 */

import { ALT, LARG, MASCARA } from "@/dados/terra";
import {
  Baldes,
  fibonacci,
  useTela,
  velocidadeDaRolagem,
  type Cena,
} from "./pontos";

/** Inclinação do eixo, em radianos. É o valor real do planeta. */
const INCLINACAO = (23.44 * Math.PI) / 180;
/** Radianos por milissegundo. Uma volta leva ~90s. */
const GIRO_BASE = 0.00007;

/**
 * Onde o planeta começa.
 *
 * Sem isto o quadro zero cai em 23,4°S / 90°O — mar aberto no Pacífico, com
 * a América do Sul raspando a borda. E o quadro zero não é um detalhe: é a
 * primeira coisa que a pessoa vê e, com `prefers-reduced-motion`, é o único
 * quadro que ela verá.
 *
 * O centro da tela fica em longitude -90° - giro. Recuar 40° traz o centro
 * para ~50°O que, cruzado com a latitude que a inclinação já impõe, dá em
 * São Paulo.
 */
const GIRO_INICIAL = -(40 * Math.PI) / 180;

/**
 * Quanto a rolagem acelera o planeta.
 *
 * `velocidadeDaRolagem()` vem em px/ms — uma rolada firme dá ~2. Este
 * fator converte isso em multiplicador do giro base. O teto existe porque
 * scroll de mouse wheel entrega picos absurdos, e sem ele um golpe de roda
 * mandaria o planeta girar meia volta de uma vez.
 */
const PUXA_ROLAGEM = 26;
const TETO_ROLAGEM = 9;
/** Distância da câmera, em raios. Menor = perspectiva mais dramática. */
const CAMERA = 2.6;
/** z da linha do horizonte. Além dele a superfície está do outro lado. */
const LIMBO = -1 / CAMERA;
/** Profundidade útil, do horizonte ao ponto mais próximo do observador. */
const FUNDO = 1 + LIMBO;
/** Direção da luz, normalizada — vinda de cima e da esquerda do observador. */
const LUZ = { x: -0.42, y: 0.5, z: -0.76 };

type P = {
  /** Posição na esfera unitária. */
  x: number;
  y: number;
  z: number;
  firme: boolean;
  brilho: number;
};

/**
 * base64 -> bytes, uma vez só.
 *
 * Preguiçoso de propósito: `atob` não existe em todo ambiente de
 * renderização no servidor, e esta função só é chamada de dentro do efeito
 * do canvas — que por definição só roda no navegador.
 */
let cache: Uint8Array | null = null;

function mascara(): Uint8Array {
  if (cache) return cache;
  const bin = atob(MASCARA);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  cache = bytes;
  return bytes;
}

/**
 * Terra firme em (longitude, latitude)?
 *
 * A conta é a inversa exata da projeção do script: em equirretangular a
 * longitude vira coluna linearmente e a latitude vira linha, com o norte
 * em cima.
 */
function ehFirme(bytes: Uint8Array, lon: number, lat: number): boolean {
  const col = Math.floor(LARG / 2 + (lon * LARG) / (2 * Math.PI));
  const lin = Math.floor(ALT / 2 - (lat * ALT) / Math.PI);
  if (col < 0 || col >= LARG || lin < 0 || lin >= ALT) return false;
  const i = lin * LARG + col;
  return ((bytes[i >> 3] >> (7 - (i & 7))) & 1) === 1;
}

function semear(bytes: Uint8Array, quantos: number): P[] {
  const ps: P[] = new Array(quantos);
  // 0,9 do espaçamento médio: o bastante para o olho parar de enxergar a
  // espiral, pouco o bastante para as costas continuarem nítidas.
  const dirs = fibonacci(quantos, 0.9);
  for (let i = 0; i < quantos; i++) {
    const d = dirs[i];
    // y é o eixo norte-sul, então a latitude sai direto do seno.
    const lat = Math.asin(Math.max(-1, Math.min(1, d.y)));
    const lon = Math.atan2(d.z, d.x);
    const firme = ehFirme(bytes, lon, lat);
    ps[i] = {
      x: d.x,
      y: d.y,
      z: d.z,
      firme,
      // A variação por ponto é o que impede a superfície de virar uma
      // chapa lisa — o olho lê granulado, não gradiente.
      /*
       * O mar existe para dar CORPO à esfera; a terra, para ser lida. Mas
       * apagar o mar demais custa a leitura de esfera — sobra um continente
       * flutuando no vazio. Estes valores mantêm a terra ~3,5× mais forte,
       * que já separa as duas coisas de longe, sem dissolver o planeta.
       */
      brilho: firme ? 0.74 + Math.random() * 0.26 : 0.19 + Math.random() * 0.09,
    };
  }
  return ps;
}

export function Terra({ className }: { className?: string }) {
  const tela = useTela((): Cena => {
    let ps: P[] = [];
    let raio = 0;
    let cx = 0;
    let cy = 0;

    /* Os dois eixos são livres — dá para virar o planeta de ponta-cabeça
       e continuar girando, sem trava nos polos. */
    let giro = GIRO_INICIAL;
    let inclina = INCLINACAO;
    let impulso = 0;
    let impulsoY = 0;
    let anterior = 0;

    // Os dois pintores vivem aqui, e não dentro do quadro: alocar sete
    // arrays 60 vezes por segundo é lixo que o coletor teria que varrer.
    const chao = new Baldes();
    const mar = new Baldes();

    return {
      medir(larg, alt) {
        raio = Math.min(larg, alt) * 0.38;
        cx = larg / 2;
        cy = alt / 2;

        /*
         * Densidade proporcional à ÁREA do globo — dobrar o raio pede
         * quatro vezes mais pontos para a superfície manter o mesmo
         * granulado. Metade é descartada pelo culling, então o que chega
         * à tela é cerca de metade disto.
         */
        // O culling no horizonte deixa passar só ~31% da esfera, então o
        // total precisa ser ~3× o que se quer ver na tela.
        const quantos = Math.round(
          Math.max(12000, Math.min(44000, raio * raio * 0.78)),
        );
        ps = semear(mascara(), quantos);
      },

      arrastar(dx, dy) {
        impulso += dx * 0.00032;
        // Invertido: arrastar para BAIXO tem que trazer o hemisfério sul
        // para a frente, como girar uma bola de verdade com a mão.
        impulsoY -= dy * 0.00028;
      },

      quadro(ctx, t) {
        const dt = anterior ? Math.min(t - anterior, 64) : 16;
        anterior = t;

        /*
         * A rolagem acelera o planeta. O sinal é preservado: descer a
         * página empurra o giro para frente, subir freia — é o que dá a
         * sensação de que o scroll está tocando o objeto, e não apenas
         * disparando uma animação ao lado dele.
         */
        const puxao = Math.max(
          -TETO_ROLAGEM,
          Math.min(TETO_ROLAGEM, velocidadeDaRolagem() * PUXA_ROLAGEM),
        );

        giro += GIRO_BASE * dt * (1 + puxao) + impulso;
        inclina += impulsoY;
        impulso *= 0.93;
        impulsoY *= 0.93;

        const sg = Math.sin(giro);
        const cg = Math.cos(giro);
        const si = Math.sin(inclina);
        const ci = Math.cos(inclina);

        /* --- atmosfera ------------------------------------------------
         * Um halo atrás dos pontos. Sem ele o globo fica recortado contra
         * o fundo; com ele ganha o ar de corpo iluminado. */
        const halo = ctx.createRadialGradient(
          cx,
          cy,
          raio * 0.72,
          cx,
          cy,
          raio * 1.42,
        );
        halo.addColorStop(0, "rgba(130,87,245,0.20)");
        halo.addColorStop(0.45, "rgba(130,87,245,0.07)");
        halo.addColorStop(1, "rgba(130,87,245,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, raio * 1.42, 0, Math.PI * 2);
        ctx.fill();

        // Terra e mar são pintados em passadas separadas para poder dar
        // cores diferentes às duas sem trocar fillStyle ponto a ponto.
        chao.limpar();
        mar.limpar();

        for (const p of ps) {
          // gira em torno do eixo Y...
          const x1 = p.x * cg - p.z * sg;
          const z1 = p.x * sg + p.z * cg;
          // ...e inclina o eixo em X.
          const y2 = p.y * ci - z1 * si;
          const z2 = p.y * si + z1 * ci;

          /*
           * Planeta é opaco: o lado de trás não existe para o olho.
           *
           * E o corte NÃO é no equador. Com câmera em perspectiva a uma
           * distância D do centro, o observador enxerga menos que meia
           * esfera: a linha do horizonte é onde o raio de visão tangencia a
           * superfície, em z = -1/D. Cortando em z = 0 sobrava uma faixa de
           * superfície do outro lado do horizonte, e como a perspectiva
           * amplia o que está perto, ela era projetada FORA da silhueta —
           * aparecia como um anel de pontos soltos em volta do planeta.
           */
          if (z2 > LIMBO) continue;

          const escala = CAMERA / (CAMERA + z2);
          const sx = cx + x1 * raio * escala;
          // MENOS y2: no canvas o eixo Y cresce para baixo, e no espaço da
          // esfera y = +1 é o polo norte. Somando, o planeta nasce de
          // cabeça para baixo — com a Groenlândia no rodapé.
          const sy = cy - y2 * raio * escala;

          /*
           * Sombreado. `luz` é o cosseno do ângulo entre a normal da
           * superfície (que na esfera unitária É a própria posição) e a
           * direção da luz. O piso de 0,25 evita que o lado escuro suma
           * por completo — queremos um planeta, não uma lua crescente.
           */
          const luz = Math.max(
            0,
            x1 * LUZ.x + y2 * LUZ.y + z2 * LUZ.z,
          );
          const sombra = 0.25 + luz * 0.75;

          // Escurece na direção do limbo. A conta normaliza a faixa útil
          // (do horizonte ao ponto mais próximo) em 0..1 — sem isso o
          // escurecimento só chegaria a 0,38 na borda e o planeta ficaria
          // com o contorno chapado.
          const frente = (-z2 + LIMBO) / FUNDO;
          const borda = 0.4 + frente * 0.6;

          const a = p.brilho * sombra * borda;
          // A escala vai de 1,0 no limbo a ~1,63 no centro (ver CAMERA).
          // O corte em 1,3 engorda só o miolo, que é o que vem mais perto.
          const tam = escala > 1.3 ? 1.9 : 1.4;

          if (p.firme) chao.por(a, sx, sy, tam);
          else mar.por(a, sx, sy, tam);
        }

        // O mar primeiro, para os continentes ficarem por cima nas bordas.
        mar.pintar(ctx, "150,150,190", 0.85);
        chao.pintar(ctx, "252,252,252", 0.95);
      },
    };
  });

  return <canvas ref={tela} className={`tela ${className ?? ""}`} />;
}
