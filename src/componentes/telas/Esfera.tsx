"use client";

/**
 * A esfera pontilhada do hero.
 *
 * Porte da esfera do app (ui/src/Esfera.tsx) sem o storyboard de abertura:
 * aqui quem faz a entrada é a própria logo, que se monta por cima. A esfera
 * só nasce, gira devagar e reage ao ponteiro.
 *
 * O centro brilhante não é um gradiente desenhado por cima — ele SAI da
 * distribuição. Espalhar os pontos uniformemente pelo VOLUME (daí o cbrt)
 * e projetar em 2D acumula mais pontos no meio, porque a corda que
 * atravessa a esfera é mais longa no centro do que na borda. É o mesmo
 * motivo pelo qual uma nuvem é mais densa no miolo.
 */

import { Baldes, faixa, molejar, useTela, type Cena, type Ponteiro } from "./pontos";

/** Fração dos pontos que fica FORA da bola, formando o halo esfumaçado. */
const HALO = 0.22;

/* Reação ao ponteiro. ALCANCE em px; DESVIO é o quanto empurra — subir
   demais rasga a esfera em vez de afundá-la. */
const ALCANCE = 215;
const DESVIO = 26;

/** Quanto tempo a esfera leva para surgir, em ms. */
const NASCER = 1500;

type P = {
  x: number;
  y: number;
  z: number;
  brilho: number;
  /* deslocamento do ponteiro, com mola */
  dx: number;
  dy: number;
  vx: number;
  vy: number;
};

function semear(quantos: number, raio: number): P[] {
  const ps: P[] = new Array(quantos);
  for (let i = 0; i < quantos; i++) {
    // Direção uniforme na esfera: sortear z e o ângulo separadamente.
    // Sortear dois ângulos concentraria pontos nos polos.
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);

    const halo = Math.random() < HALO;
    const r = halo
      ? raio * (1 + 0.75 * Math.random() ** 2)
      : raio * Math.cbrt(Math.random());

    ps[i] = {
      x: r * s * Math.cos(a),
      y: r * s * Math.sin(a),
      z: r * z,
      brilho: halo ? 0.1 + Math.random() * 0.3 : 0.45 + Math.random() * 0.55,
      dx: 0,
      dy: 0,
      vx: 0,
      vy: 0,
    };
  }
  return ps;
}

export function Esfera({ className }: { className?: string }) {
  const tela = useTela((ponteiro: Ponteiro): Cena => {
    let ps: P[] = [];
    let cx = 0;
    let cy = 0;
    const baldes = new Baldes();

    return {
      medir(larg, alt) {
        cx = larg / 2;
        cy = alt / 2;
        const raio = Math.min(larg, alt) * 0.36;
        const quantos = Math.round(Math.max(3200, Math.min(11000, raio * 30)));
        ps = semear(quantos, raio);
      },

      quadro(ctx, t) {
        const giro = t * 0.00016;
        const nascendo = faixa(t, 0, NASCER);

        const sen = Math.sin(giro);
        const cos = Math.cos(giro);
        const inclina = 0.32;
        const si = Math.sin(inclina);
        const ci = Math.cos(inclina);
        const dist = 500;

        baldes.limpar();

        for (const p of ps) {
          // gira em Y, depois inclina em X
          const x1 = p.x * cos - p.z * sen;
          const z1 = p.x * sen + p.z * cos;
          const y2 = p.y * ci - z1 * si;
          const z2 = p.y * si + z1 * ci;

          const escala = dist / (dist + z2);
          let sx = cx + x1 * escala;
          let sy = cy + y2 * escala;

          // Entrada: os pontos partem do centro e abrem até o lugar.
          if (nascendo < 1) {
            const k = 1 - (1 - nascendo) ** 3;
            sx = cx + (sx - cx) * k;
            sy = cy + (sy - cy) * k;
          }

          molejar(p, sx, sy, ponteiro, ALCANCE, DESVIO);
          sx += p.dx;
          sy += p.dy;

          const prof = (escala - 0.82) / 0.36; // 0 fundo, 1 frente
          const a =
            p.brilho *
            (0.3 + Math.max(0, Math.min(1, prof)) * 0.7) *
            (0.35 + nascendo * 0.65);

          baldes.por(a, sx, sy, escala > 1.02 ? 1.9 : 1.3);
        }

        baldes.pintar(ctx);
      },
    };
  });

  return <canvas ref={tela} className={`tela ${className ?? ""}`} />;
}
