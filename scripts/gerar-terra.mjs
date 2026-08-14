/**
 * Gera a máscara de terra firme usada pelo globo.
 *
 *     npm run terra
 *
 * POR QUE ISTO EXISTE
 *
 * Para desenhar a Terra girando não é preciso um "modelo 3D do mapa-múndi".
 * Um modelo desses (malha + textura) custa megabytes e traz uma biblioteca
 * de 3D junto, e o resultado seria um planeta realista — que briga com a
 * identidade pontilhada do resto da página.
 *
 * O que a gente precisa de verdade é de uma única resposta, repetida: dado
 * um par (latitude, longitude), isso é terra ou mar? Com ela, os pontos do
 * globo são gerados por matemática na hora, do mesmo jeito que a esfera do
 * hero — e o planeta vira parte do mesmo sistema visual, não um corpo
 * estranho.
 *
 * Então a geografia entra UMA VEZ, aqui no build, e sai como um bitmap de
 * 1 bit por célula: 360×180 células = 8.100 bytes, ~11 KB em base64 e
 * pouco mais de 2 KB depois do gzip. Nenhuma dependência sobra no bundle.
 *
 * COMO
 *
 * 1. `world-atlas` traz as costas do mundo em TopoJSON (Natural Earth 110m).
 * 2. `d3-geo` projeta em equirretangular. Ele é quem resolve os casos
 *    chatos — anel que cruza a antimeridiana, Antártida colada no polo —
 *    e entrega polígonos planos e bem-comportados.
 * 3. Um scanline de paridade par-ímpar preenche esses polígonos. É O(linhas
 *    × arestas) e roda em milissegundos; testar ponto a ponto com
 *    geoContains seria ~64.800 × milhares de arestas e levaria minutos.
 *    Par-ímpar também acerta os buracos de graça: o mar Cáspio tem o anel
 *    dele contado, vira duas travessias a mais e a paridade volta pra água.
 *
 * Quer mais detalhe de costa? Suba RESOLUCAO. O custo cresce ao quadrado.
 */

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");

/** Células por 360° de longitude. A altura é sempre a metade. */
const RESOLUCAO = 360;
const LARG = RESOLUCAO;
const ALT = RESOLUCAO / 2;

/* --- 1. as costas ----------------------------------------------------- */

function lerAtlas() {
  // O campo "exports" do pacote pode barrar o require direto do .json,
  // dependendo da versão do npm. Aí caímos na leitura do arquivo.
  try {
    return require("world-atlas/land-110m.json");
  } catch {
    const caminho = join(raiz, "node_modules", "world-atlas", "land-110m.json");
    return JSON.parse(readFileSync(caminho, "utf8"));
  }
}

const topo = lerAtlas();
const terra = feature(topo, topo.objects.land);

/* --- 2. projetar ------------------------------------------------------ */

/*
 * Em equirretangular a longitude vira x linearmente, então 2π radianos
 * precisam caber em LARG px: scale = LARG / 2π. A altura sai sozinha em
 * π × scale = LARG / 2 = ALT, que é justamente a proporção 2:1 da projeção.
 */
const projecao = geoEquirectangular()
  .translate([LARG / 2, ALT / 2])
  .scale(LARG / (2 * Math.PI));

/** Um "contexto de canvas" que, em vez de pintar, guarda os anéis. */
const aneis = [];
let atual = null;

const coletor = {
  beginPath() {},
  moveTo(x, y) {
    atual = [x, y];
    aneis.push(atual);
  },
  lineTo(x, y) {
    atual.push(x, y);
  },
  closePath() {},
  arc() {},
};

geoPath(projecao, coletor)(terra);

if (!aneis.length) {
  console.error("Nenhum anel saiu da projeção — o atlas veio vazio?");
  process.exit(1);
}

/* --- 3. rasterizar ---------------------------------------------------- */

const mascara = new Uint8Array(LARG * ALT);
const xs = [];

for (let y = 0; y < ALT; y++) {
  // O centro da célula, não a borda: evita que uma costa exatamente sobre
  // a linha da grade entre ou saia dependendo de erro de arredondamento.
  const linha = y + 0.5;
  xs.length = 0;

  for (const anel of aneis) {
    const n = anel.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const y1 = anel[i * 2 + 1];
      const y2 = anel[j * 2 + 1];
      // Regra semiaberta [y1, y2): um vértice que encosta na linha conta
      // uma vez só, senão a paridade inverte e a costa "vaza".
      if ((y1 <= linha && y2 > linha) || (y2 <= linha && y1 > linha)) {
        const x1 = anel[i * 2];
        const x2 = anel[j * 2];
        xs.push(x1 + ((linha - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
  }

  if (xs.length < 2) continue;
  xs.sort((a, b) => a - b);

  for (let k = 0; k + 1 < xs.length; k += 2) {
    const de = Math.max(0, Math.ceil(xs[k] - 0.5));
    const ate = Math.min(LARG - 1, Math.floor(xs[k + 1] - 0.5));
    for (let x = de; x <= ate; x++) mascara[y * LARG + x] = 1;
  }
}

/* --- 4. empacotar ----------------------------------------------------- */

const bytes = new Uint8Array(Math.ceil((LARG * ALT) / 8));
let firme = 0;
for (let i = 0; i < mascara.length; i++) {
  if (!mascara[i]) continue;
  firme++;
  bytes[i >> 3] |= 128 >> (i & 7);
}

const base64 = Buffer.from(bytes).toString("base64");
const proporcao = (firme / mascara.length) * 100;

const saida = `/*
 * GERADO por scripts/gerar-terra.mjs — não editar à mão.
 * Rode \`npm run terra\` para regenerar.
 *
 * Bitmap equirretangular de 1 bit por célula: 1 = terra firme, 0 = água.
 * A célula (x, y) é o bit  y * LARG + x , do mais significativo para o
 * menos dentro de cada byte.
 */

export const LARG = ${LARG};
export const ALT = ${ALT};

/** ${proporcao.toFixed(1)}% das células são terra firme. */
export const MASCARA =
  "${base64}";
`;

mkdirSync(join(raiz, "src", "dados"), { recursive: true });
writeFileSync(join(raiz, "src", "dados", "terra.ts"), saida, "utf8");

console.log(
  `terra.ts: ${LARG}×${ALT}, ${bytes.length} bytes -> ${base64.length} em base64`,
);
console.log(
  `terra firme: ${proporcao.toFixed(1)}% (o planeta real tem ~29%)`,
);
