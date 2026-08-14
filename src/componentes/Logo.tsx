"use client";

/**
 * Logo I.V.E.
 *
 *   <LogoIVE />                  anima em loop
 *   <LogoIVE modo="uma-vez" />   monta uma vez e congela montada
 *   <LogoIVE modo="parada" />    estática, pro cabeçalho e rodapé
 *   <LogoMarca />                marca simples: só o "i"
 *
 * A animação mora no logo.css e é o desenho original, intacto. O que este
 * arquivo acrescenta é a MEDIÇÃO: em vez de chumbar "barra de 18px", ele
 * mede o glifo "I" da fonte de verdade e escreve as variáveis CSS. Assim a
 * barra tem exatamente a espessura do I em qualquer tamanho, e nada quebra
 * se a fonte demorar a carregar.
 */

import { useEffect, useRef, useState } from "react";
import "./logo.css";

/* O E termina de entrar aos 52% de um ciclo de 6s. É aí que congelamos. */
const MONTAGEM_MS = 3_200;
/* Rede de segurança: nenhuma condição estranha pode deixar a logo tremendo
   pra sempre se a animação não anexar. */
const TETO_MS = 9_000;

type Modo = "anima" | "uma-vez" | "parada";

/**
 * Quanto vai entre os elementos, como fração da espessura da barra.
 * Único número a mexer se quiser o conjunto mais apertado ou mais solto.
 */
const VAO = 0.3;

/** Mede a fonte real e escreve as medidas no elemento. */
function medir(lock: HTMLDivElement): boolean {
  const cs = getComputedStyle(lock);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;

  // O peso entra na conta: uma fonte pedida em 700 mede diferente da 400.
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = ctx.measureText("I");
  const alturaCaixa = Math.round(m.actualBoundingBoxAscent);
  const largura = Math.round(
    Math.abs(m.actualBoundingBoxRight - m.actualBoundingBoxLeft),
  );

  // Fonte ainda não chegou: a métrica vem degenerada. Tenta de novo depois.
  if (!alturaCaixa || !largura || largura < 6) return false;

  const vao = Math.max(2, Math.round(largura * VAO));

  lock.querySelectorAll<HTMLElement>(".tira, .pingo").forEach((b) => {
    b.style.width = `${largura}px`;
    b.style.height = `${largura}px`;
  });
  const haste = lock.querySelector<HTMLElement>(".haste");
  if (haste) haste.style.height = `${alturaCaixa}px`;

  /*
   * Por que o I.V.E parecia irregular:
   *
   * A barra e o quadrado são divs — ocupam exatamente a tinta, sem sobra.
   * O V e o E são glifos, e toda fonte embute uma lateral vazia em cada um.
   * Com `gap` uniforme, o vão VISÍVEL ao redor das letras ficava maior que
   * ao redor dos quadrados, e o conjunto perdia o ritmo.
   *
   * A correção é medir essa lateral vazia e cancelar com margem negativa.
   */
  const enxugar = (el: HTMLElement | null, letra: string) => {
    if (!el) return;
    const g = ctx.measureText(letra);
    el.style.marginLeft = `${Math.round(g.actualBoundingBoxLeft)}px`;
    el.style.marginRight = `${Math.round(g.actualBoundingBoxRight - g.width)}px`;
  };
  enxugar(lock.querySelector<HTMLElement>(".g-v"), "V");
  enxugar(lock.querySelector<HTMLElement>(".g-e"), "E");

  lock.style.gap = `${vao}px`;
  lock.style.setProperty("--dx", `${-(largura + vao)}px`);
  lock.style.setProperty(
    "--dy",
    `${-(alturaCaixa + Math.round(alturaCaixa * 0.3))}px`,
  );
  lock.style.setProperty("--draw", `${Math.round(alturaCaixa * 0.4)}px`);
  // Depois das margens e do gap — senão offsetWidth vem da largura antiga.
  lock.style.setProperty(
    "--cx",
    `${Math.round((lock.offsetWidth - largura) / 2)}px`,
  );
  return true;
}

export function LogoIVE({
  tamanho = 84,
  modo = "anima",
}: {
  /**
   * Número vira px. String passa direto, então dá pra mandar
   * `clamp(38px, 8vw, 76px)` e ter a logo acompanhando a viewport —
   * `medir()` lê o tamanho JÁ RESOLVIDO via getComputedStyle, então a
   * conta continua batendo.
   */
  tamanho?: number | string;
  modo?: Modo;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [congelada, setCongelada] = useState(false);

  useEffect(() => {
    const lock = ref.current;
    if (!lock) return;

    let vivo = true;
    let tentativas = 0;

    // A fonte pode chegar depois do primeiro paint. Tenta até a métrica vir
    // sã, em vez de desenhar uma logo torta e deixar assim.
    const tentar = () => {
      if (!vivo || medir(lock) || ++tentativas > 20) return;
      setTimeout(tentar, 150);
    };

    document.fonts?.ready.then(tentar).catch(() => tentar());
    tentar();

    /*
     * Com tamanho em `clamp()`, redimensionar a janela muda o font-size sem
     * mudar nenhuma prop — o efeito não reexecutaria e a logo ficaria com as
     * medidas da largura antiga (barra grossa demais, vãos errados). O
     * observer resolve isso na fonte: mudou de tamanho, mede de novo.
     */
    const ro = new ResizeObserver(() => {
      if (vivo) medir(lock);
    });
    ro.observe(lock);

    return () => {
      vivo = false;
      ro.disconnect();
    };
  }, [tamanho]);

  /*
   * Congelar a montagem, no modo "uma-vez".
   *
   * O relógio é o da PRÓPRIA animação, não o de parede. O navegador congela
   * animações CSS em aba oculta, mas setTimeout continua correndo — com
   * timer, abrir a página numa aba em segundo plano faria a logo "montar"
   * sem nunca ter animado. requestAnimationFrame para junto com a animação,
   * então os dois concordam.
   */
  useEffect(() => {
    if (modo !== "uma-vez") return;
    const lock = ref.current;
    if (!lock) return;

    let quadro = 0;
    let primeiro = 0;

    const passo = (agora: number) => {
      if (!primeiro) primeiro = agora;

      const haste = lock.querySelector<HTMLElement>(".haste");
      const anim = haste?.getAnimations()[0];

      // Sem animação anexada = prefers-reduced-motion (o CSS zera tudo e
      // mostra a logo montada). Nada a esperar.
      const montada =
        (haste && !anim) ||
        Number(anim?.currentTime ?? 0) >= MONTAGEM_MS ||
        agora - primeiro > TETO_MS;

      if (montada) {
        setCongelada(true);
        return;
      }
      quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [modo]);

  const classes = [
    "ive-logo",
    modo === "parada" ? "parada" : "anima",
    congelada ? "congelada" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      style={{ fontSize: typeof tamanho === "number" ? `${tamanho}px` : tamanho }}
      role="img"
      aria-label="I.V.E"
    >
      <div className="tira haste" />
      <div className="pingo">
        <div className="pingo-y">
          <div className="pingo-r" />
        </div>
      </div>
      <span className="resto g-v" aria-hidden="true">
        V
      </span>
      <div className="tira resto ponto-2" />
      <span className="resto g-e" aria-hidden="true">
        E
      </span>
    </div>
  );
}

/**
 * Marca simples: só o "i" — haste com o pingo quadrado em cima. É o estado
 * de repouso da animação, congelado. Serve pro cabeçalho, o rodapé e
 * qualquer lugar apertado demais pro I.V.E inteiro.
 */
export function LogoMarca({ tamanho = 24 }: { tamanho?: number }) {
  // Proporções tiradas da própria animação: pingo = 0,3 da altura do I,
  // vão = 0,3, haste = 1,0. Total 1,6 alturas de caixa.
  const caixa = tamanho / 1.6;
  const barra = Math.max(2, Math.round(caixa * 0.3));
  return (
    <span
      className="ive-marca"
      style={{ width: barra, height: tamanho }}
      aria-hidden="true"
    >
      <span style={{ width: barra, height: barra }} />
      <span style={{ width: 0, height: Math.round(caixa * 0.3) }} />
      <span style={{ width: barra, height: Math.round(caixa) }} />
    </span>
  );
}
