"use client";

/**
 * Núcleo das telas de partículas.
 *
 * As três cenas da página — a esfera do hero, a galáxia e a Terra — são o
 * mesmo motor com sementes diferentes. O que muda é ONDE os pontos nascem;
 * projeção, rotação, profundidade e pintura são idênticos. Por isso moram
 * aqui e não copiados três vezes.
 *
 * Duas decisões de desempenho que não são óbvias:
 *
 * 1. O gargalo de um canvas com milhares de pontos NÃO é o número de
 *    pontos — é a troca de `fillStyle`. Trocar 14.000 vezes por quadro
 *    derruba o frame rate; agrupar em 7 baldes de opacidade faz 7 trocas.
 *
 * 2. A página tem três telas e só uma aparece por vez. Sem o
 *    IntersectionObserver as três ficariam girando o tempo todo, e o
 *    notebook do usuário pagaria por duas animações que ninguém está
 *    vendo.
 */

import { useEffect, useRef } from "react";

export type Ponteiro = { x: number; y: number; dentro: boolean };

export type Cena = {
  /** Roda na montagem e a cada mudança de tamanho. Semeie aqui. */
  medir(larg: number, alt: number): void;
  /** Um quadro. `t` é o tempo de animação em ms — pausa junto com a tela. */
  quadro(
    ctx: CanvasRenderingContext2D,
    t: number,
    larg: number,
    alt: number,
  ): void;
  /** Arrasto do ponteiro desde o último quadro, em px. Opcional. */
  arrastar?(dx: number, dy: number): void;
};

/* --- velocidade da rolagem ------------------------------------------- */

/*
 * Quanto a página está correndo, em px por ms. As cenas leem isto para
 * girar mais rápido enquanto o usuário rola — o efeito de a galáxia e o
 * planeta "acompanharem" o scroll.
 *
 * Mora aqui, como singleton, e não num hook por cena: são três telas
 * lendo o MESMO dado da janela. Três ouvintes de scroll fariam o mesmo
 * cálculo três vezes por evento, e o scroll é o evento mais quente que
 * existe numa página.
 */
let vRolagem = 0;
let instanteRolagem = 0;
let ouvindo = false;

function ouvirRolagem() {
  if (ouvindo || typeof window === "undefined") return;
  ouvindo = true;

  let ultimoY = window.scrollY;
  let ultimoT = performance.now();

  window.addEventListener(
    "scroll",
    () => {
      const agora = performance.now();
      // Teto no dt: dois eventos separados por uma pausa longa dariam uma
      // velocidade minúscula e matariam o efeito logo no primeiro gesto.
      const dt = Math.min(Math.max(agora - ultimoT, 1), 120);
      const dy = window.scrollY - ultimoY;

      // Média móvel: um evento isolado de scroll é ruidoso demais para
      // mandar direto na rotação — daria solavanco em vez de arrasto.
      vRolagem = vRolagem * 0.55 + (dy / dt) * 0.45;
      ultimoY = window.scrollY;
      ultimoT = agora;
      instanteRolagem = agora;
    },
    { passive: true },
  );
}

/**
 * Velocidade atual, já decaída. Em px/ms: rolar rápido dá ~3, um gesto
 * calmo dá ~0,5.
 *
 * O decaimento é calculado NA LEITURA, e não num laço próprio, para que
 * várias cenas possam ler no mesmo quadro sem uma consumir o estado da
 * outra.
 */
export function velocidadeDaRolagem(): number {
  if (!instanteRolagem) return 0;
  const idade = performance.now() - instanteRolagem;
  if (idade > 400) return 0;
  return vRolagem * Math.exp(-idade / 110);
}

/* --- curvas ---------------------------------------------------------- */

export const suave = (t: number) => t * t * (3 - 2 * t);
export const saida = (t: number) => 1 - (1 - t) ** 3;
export const faixa = (t: number, a: number, b: number) =>
  Math.max(0, Math.min(1, (t - a) / (b - a)));

/* --- pintor por baldes de opacidade ---------------------------------- */

const BALDES = 7;

export class Baldes {
  /** Cada balde é um array plano [x, y, tam, x, y, tam, ...]. */
  private listas: number[][] = Array.from({ length: BALDES }, () => []);

  limpar() {
    for (const l of this.listas) l.length = 0;
  }

  /** `a` de 0 a 1. Abaixo do primeiro balde o ponto é invisível: descarta. */
  por(a: number, x: number, y: number, tam: number) {
    const i = Math.round(Math.max(0, Math.min(1, a)) * (BALDES - 1));
    if (i === 0) return;
    this.listas[i].push(x, y, tam);
  }

  /** `cor` em "r,g,b" — o alpha sai do balde. */
  pintar(ctx: CanvasRenderingContext2D, cor = "252,252,252", teto = 0.95) {
    for (let b = 1; b < BALDES; b++) {
      const lista = this.listas[b];
      if (!lista.length) continue;
      ctx.fillStyle = `rgba(${cor},${(b / (BALDES - 1)) * teto})`;
      for (let i = 0; i < lista.length; i += 3) {
        const s = lista[i + 2];
        ctx.fillRect(lista[i], lista[i + 1], s, s);
      }
    }
  }
}

/* --- o ponteiro, com mola -------------------------------------------- */

/**
 * Empurra um ponto para longe do cursor e o traz de volta com mola.
 * Guarda o próprio estado (deslocamento e velocidade) no objeto passado.
 */
export type Mola = { dx: number; dy: number; vx: number; vy: number };

export function molejar(
  p: Mola,
  sx: number,
  sy: number,
  ponteiro: Ponteiro,
  alcance: number,
  desvio: number,
  volta = 0.055,
  atrito = 0.86,
) {
  if (ponteiro.dentro) {
    const ax = sx + p.dx - ponteiro.x;
    const ay = sy + p.dy - ponteiro.y;
    const d2 = ax * ax + ay * ay;
    if (d2 < alcance * alcance && d2 > 0.01) {
      const d = Math.sqrt(d2);
      // Quadrático: quem está na beirada do alcance quase não sente, quem
      // está embaixo do cursor sente tudo.
      const empurra = (1 - d / alcance) ** 2 * desvio;
      p.vx += (ax / d) * empurra * 0.12;
      p.vy += (ay / d) * empurra * 0.12;
    }
  }
  p.vx += -p.dx * volta;
  p.vy += -p.dy * volta;
  p.vx *= atrito;
  p.vy *= atrito;
  p.dx += p.vx;
  p.dy += p.vy;
}

/* --- semeadura ------------------------------------------------------- */

/**
 * Direções uniformes numa esfera pelo método de Fibonacci.
 *
 * O jeito ingênuo — sortear dois ângulos — amontoa pontos nos polos, e num
 * globo isso aparece na hora: a Sibéria fica com o dobro da densidade do
 * equador. O ângulo áureo distribui em espiral, com espaçamento quase
 * constante e sem aglomerado nenhum.
 *
 * `tremor` (0 a 1) desmancha a regularidade. A espiral é ORDENADA DEMAIS:
 * desenhada como pontos, o olho para de ver superfície e passa a ver as
 * linhas da espiral — o mesmo moiré de uma tela de impressão. Um empurrão
 * aleatório da ordem do espaçamento médio entre vizinhos mata o padrão sem
 * estragar a uniformidade que era o motivo de usar Fibonacci.
 */
export function fibonacci(
  n: number,
  tremor = 0,
): { x: number; y: number; z: number }[] {
  const ps = new Array(n);
  const passo = Math.PI * (3 - Math.sqrt(5)); // ângulo áureo
  // Espaçamento médio: n pontos dividindo a área 4π de uma esfera unitária.
  const espaco = Math.sqrt((4 * Math.PI) / n) * tremor;

  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2; // de +1 a -1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = passo * i;

    let px = Math.cos(a) * r;
    let py = y;
    let pz = Math.sin(a) * r;

    if (espaco > 0) {
      px += (Math.random() - 0.5) * espaco;
      py += (Math.random() - 0.5) * espaco;
      pz += (Math.random() - 0.5) * espaco;
      // De volta para a superfície: o empurrão tirou o ponto da esfera.
      const m = Math.hypot(px, py, pz) || 1;
      px /= m;
      py /= m;
      pz /= m;
    }

    ps[i] = { x: px, y: py, z: pz };
  }
  return ps;
}

/* --- o hook ---------------------------------------------------------- */

export function useTela(fabrica: (ponteiro: Ponteiro) => Cena) {
  const tela = useRef<HTMLCanvasElement>(null);
  const fab = useRef(fabrica);
  fab.current = fabrica;

  useEffect(() => {
    const cv = tela.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;

    const parado = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ponteiro: Ponteiro = { x: -9999, y: -9999, dentro: false };
    const cena = fab.current(ponteiro);

    if (!parado) ouvirRolagem();

    let larg = 0;
    let alt = 0;

    function medir() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv!.getBoundingClientRect();
      if (!r.width || !r.height) return;
      larg = r.width;
      alt = r.height;
      cv!.width = Math.round(larg * dpr);
      cv!.height = Math.round(alt * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cena.medir(larg, alt);

      /*
       * Pinta o quadro zero AQUI, de forma síncrona, e não só no primeiro
       * requestAnimationFrame.
       *
       * rAF não dispara em página oculta. Quem abre a landing numa aba de
       * segundo plano — um Ctrl+clique, um link restaurado na inicialização
       * do navegador — encontraria três buracos no lugar das cenas ao
       * chegar nela. Redimensionar o canvas também o apaga, então o mesmo
       * desenho serve para não piscar durante o resize.
       */
      ctx!.clearRect(0, 0, larg, alt);
      cena.quadro(ctx!, 0, larg, alt);
    }

    medir();

    // ResizeObserver e não window.resize: a tela pode mudar de tamanho sem
    // a janela mudar (a coluna do grid encolhe quando o texto ao lado cresce).
    const ro = new ResizeObserver(medir);
    ro.observe(cv);

    /* --- ponteiro ---------------------------------------------------- */

    let arrastando = false;
    let ultimoX = 0;
    let ultimoYPtr = 0;

    const aoMover = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ponteiro.x = e.clientX - r.left;
      ponteiro.y = e.clientY - r.top;
      ponteiro.dentro = true;
      if (arrastando && cena.arrastar) {
        cena.arrastar(e.clientX - ultimoX, e.clientY - ultimoYPtr);
        ultimoX = e.clientX;
        ultimoYPtr = e.clientY;
      }
    };
    const aoSair = () => {
      ponteiro.dentro = false;
      ponteiro.x = ponteiro.y = -9999;
    };
    const aoDescer = (e: PointerEvent) => {
      if (!cena.arrastar) return;
      arrastando = true;
      ultimoX = e.clientX;
      ultimoYPtr = e.clientY;
      cv.setPointerCapture(e.pointerId);
    };
    const aoSubir = (e: PointerEvent) => {
      if (!arrastando) return;
      arrastando = false;
      try {
        cv.releasePointerCapture(e.pointerId);
      } catch {
        /* o ponteiro já pode ter sido solto pelo navegador */
      }
    };

    if (!parado) {
      cv.addEventListener("pointermove", aoMover);
      cv.addEventListener("pointerleave", aoSair);
      cv.addEventListener("pointerdown", aoDescer);
      cv.addEventListener("pointerup", aoSubir);
      cv.addEventListener("pointercancel", aoSubir);
    }

    /* --- laço -------------------------------------------------------- */

    // Com reduced-motion o quadro zero que `medir()` já pintou é o quadro
    // final. Nada de laço, nada de reagir ao ponteiro: quem pediu menos
    // movimento não quer nem isso.
    if (parado) return () => ro.disconnect();

    let quadro = 0;
    let tAcum = 0;
    let ultimo = 0;
    let visivel = true;

    const passo = (agora: number) => {
      if (!ultimo) ultimo = agora;
      // Teto no delta: uma aba que volta do segundo plano entrega um salto
      // de vários segundos, e sem o teto o globo daria um pulo.
      const dt = Math.min(agora - ultimo, 64);
      ultimo = agora;
      tAcum += dt;

      ctx.clearRect(0, 0, larg, alt);
      cena.quadro(ctx, tAcum, larg, alt);

      quadro = requestAnimationFrame(passo);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting === visivel) return;
        visivel = e.isIntersecting;
        if (visivel) {
          ultimo = 0; // não conta o tempo em que esteve fora da tela
          quadro = requestAnimationFrame(passo);
        } else {
          cancelAnimationFrame(quadro);
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(cv);

    quadro = requestAnimationFrame(passo);

    return () => {
      cancelAnimationFrame(quadro);
      io.disconnect();
      ro.disconnect();
      cv.removeEventListener("pointermove", aoMover);
      cv.removeEventListener("pointerleave", aoSair);
      cv.removeEventListener("pointerdown", aoDescer);
      cv.removeEventListener("pointerup", aoSubir);
      cv.removeEventListener("pointercancel", aoSubir);
    };
  }, []);

  return tela;
}
