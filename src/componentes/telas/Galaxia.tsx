"use client";

/**
 * A galáxia da seção "Quem é I.V.E?".
 *
 * Um disco visto quase de perfil — é a inclinação forte que transforma o
 * círculo na elipse comprida do desenho. Duas escolhas fazem ela parecer
 * viva em vez de um GIF girando:
 *
 * · ROTAÇÃO DIFERENCIAL. Cada ponto tem a própria velocidade angular, maior
 *   perto do centro. Um disco que gira rígido denuncia na hora que é uma
 *   imagem girando; um que cisalha parece matéria em órbita. É também o que
 *   galáxias de verdade fazem.
 *
 * · O MIOLO É VAZADO. A densidade sobe do centro para um anel e cai depois,
 *   em vez de ser um borrão que decai do meio. Sem isso a forma vira uma
 *   bola desfocada e perde a leitura de disco.
 */

import { Baldes, faixa, useTela, velocidadeDaRolagem, type Cena } from "./pontos";

/** Inclinação do disco. 0 = de perfil, π/2 = de frente. */
const INCLINACAO = 0.4;
/** Rotação do conjunto no plano da tela, para a elipse não ficar deitada. */
const ROLAGEM = -0.13;
/** Radianos por ms na borda. O centro gira mais rápido — ver `omega`. */
const GIRO_BASE = 0.00019;

const NASCER = 1800;

/** Quanto a rolagem acelera o disco. Ver o mesmo par em Terra.tsx. */
const PUXA_ROLAGEM = 22;
const TETO_ROLAGEM = 8;

type P = {
  /** raio no disco, de 0 a ~1,1 */
  r: number;
  /** ângulo inicial */
  a: number;
  /** altura fora do plano do disco */
  h: number;
  brilho: number;
  omega: number;
};

/** Normal aproximada pela soma de uniformes — mais barata que Box-Muller. */
function sino(): number {
  return (Math.random() + Math.random() + Math.random()) / 3;
}

function semear(quantos: number): P[] {
  const ps: P[] = new Array(quantos);
  for (let i = 0; i < quantos; i++) {
    /*
     * O halo é grande e generoso — 30% dos pontos, indo até 2,3 raios.
     *
     * É ele que resolve a borda: sem uma cauda longa e rala, a densidade
     * cai a zero de uma vez e o disco ganha um contorno visível, como se
     * alguém tivesse recortado a galáxia com tesoura. O expoente 2,4 põe
     * a maior parte desses pontos perto do disco e vai rareando para
     * fora, que é como poeira se comporta.
     */
    const halo = Math.random() < 0.3;

    // O anel: a soma de uniformes dá uma corcova no meio da faixa, então
    // a densidade nasce baixa no miolo, pica no anel e cai na borda.
    const r = halo ? 1.0 + Math.random() ** 2.4 * 1.3 : 0.14 + sino() * 0.95;

    const a = Math.random() * Math.PI * 2;

    // O disco é mais grosso no centro (o bojo) e afina para fora.
    const h = (Math.random() - 0.5) * 0.16 * Math.max(0.15, 1 - r * 0.75);

    /*
     * Curva de rotação achatada: perto do centro a velocidade angular é
     * alta e cai suave. O +0.38 é o que impede o miolo de virar um
     * liquidificador — sem ele, omega explode quando r tende a zero.
     */
    const omega = GIRO_BASE / (0.38 + r);

    // Grumos: um seno em ângulo e raio dá textura de braço sem precisar
    // de ruído. Como a rotação é diferencial, os grumos cisalham sozinhos
    // com o tempo, que é exatamente o que matéria em órbita faz.
    const grumo = 0.72 + 0.34 * Math.sin(a * 2.4 + r * 7.5);

    /*
     * O halo desbota com a distância em vez de ter um brilho fixo. É a
     * segunda metade da solução da borda: mesmo o ponto mais externo tem
     * um vizinho um pouco mais fraco adiante, então nunca existe uma
     * última fileira brilhante marcando onde a galáxia acaba.
     */
    const desbota = halo ? Math.max(0, 1 - (r - 1) / 1.3) ** 1.7 : 1;

    ps[i] = {
      r,
      a,
      h,
      omega,
      brilho: halo
        ? (0.1 + Math.random() * 0.3) * desbota
        : Math.min(1, (0.46 + Math.random() * 0.72) * grumo),
    };
  }
  return ps;
}

export function Galaxia({ className }: { className?: string }) {
  const tela = useTela((): Cena => {
    let ps: P[] = [];
    let cx = 0;
    let cy = 0;
    let raio = 0;
    let tGiro = 0;
    let anterior = 0;
    const baldes = new Baldes();

    return {
      medir(larg, alt) {
        cx = larg * 0.5;
        cy = alt * 0.5;
        // O disco é largo: usa a maior dimensão, senão some numa coluna
        // estreita.
        raio = Math.max(larg, alt) * 0.42;
        ps = semear(Math.round(Math.max(11000, Math.min(34000, raio * 58))));
      },

      quadro(ctx, t) {
        const nascendo = faixa(t, 0, NASCER);

        /*
         * O tempo do GIRO é próprio, e não o `t` do relógio.
         *
         * Cada ponto tem posição `a + omega * tempo`, então acelerar com a
         * rolagem é acelerar o tempo — e ele precisa ser acumulado, senão
         * mudar o multiplicador teleportaria a galáxia inteira para outro
         * ângulo em vez de apressá-la.
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
        const dist = 900;

        baldes.limpar();

        for (const p of ps) {
          const ang = p.a + p.omega * tGiro;

          // no plano do disco
          const dx = Math.cos(ang) * p.r * raio;
          const dz = Math.sin(ang) * p.r * raio;
          const dy = p.h * raio;

          // inclina em X: é isso que achata o círculo numa elipse
          const y1 = dy * ci - dz * si;
          const z1 = dy * si + dz * ci;

          // rola no plano da tela
          const x2 = dx * cr - y1 * sr;
          const y2 = dx * sr + y1 * cr;

          const escala = dist / (dist + z1);
          const sx = cx + x2 * escala;
          const sy = cy + y2 * escala;

          const prof = Math.max(0, Math.min(1, (escala - 0.86) / 0.28));
          const a = p.brilho * (0.42 + prof * 0.58) * nascendo;

          baldes.por(a, sx, sy, escala > 1.02 ? 1.7 : 1.25);
        }

        baldes.pintar(ctx, "252,251,255", 1);
      },
    };
  });

  return <canvas ref={tela} className={`tela ${className ?? ""}`} />;
}
