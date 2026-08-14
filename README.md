# IDEA. — landing

A vitrine do I.V.E. Site estático em Next.js, com repositório próprio.

Mora dentro de `.IVE/` para ficar perto do produto, mas é **repositório
próprio**. A separação segue a mesma linha de openai.com e chatgpt.com: a
vitrine e o produto crescem em ritmos diferentes e não devem se atrapalhar —
esta aqui é HTML estático num CDN, aquele lá precisa da API Python.

`.IVE/` não é repositório nenhum: é só a gaveta que guarda os dois, lado a
lado. Nenhum está dentro do outro.

```
.IVE/
├── project-ive/            o motor e o produto (repo separado)
│   ├── ive/                motor Python — o agente e as ferramentas
│   └── ui/                 a tela onde a conversa acontece (Vite + React)
└── landing-page-ive/       esta pasta — a vitrine (Next.js)
```

## Rodar

```bash
npm install
npm run dev
```

Abre em http://localhost:3000.

A caixa do topo manda a pergunta para o app. Para a travessia funcionar em
desenvolvimento, o produto também precisa estar de pé — nas outras duas
pontas, em dois terminais:

```bash
npm run dev --prefix ../project-ive/ui
```

```bash
cd ../project-ive && .venv/Scripts/python.exe -m uvicorn ive.servidor:app --port 8010
```

Em produção, aponte para o domínio real:

```bash
cp .env.example .env.local   # e edite NEXT_PUBLIC_IVE_URL
```

## Publicar

`next.config.ts` está em `output: "export"`, então o build cospe HTML puro:

```bash
npm run build
```

Sai em `out/`, que sobe em qualquer lugar — Vercel, Netlify, GitHub Pages,
um bucket. Não há servidor Node em produção. Se um dia a landing precisar de
um (formulário de contato, blog com revalidação), é só remover essa linha.

## Como a página está montada

| arquivo | o que faz |
| --- | --- |
| `src/app/globals.css` | os tokens da identidade — duas cores mandam em tudo |
| `src/app/page.tsx` | as cinco seções, em ordem |
| `src/componentes/Logo.tsx` | a logo I.V.E, medindo a fonte real |
| `src/componentes/telas/pontos.ts` | o motor de partículas, compartilhado |
| `src/lib/ive.ts` | o único lugar que sabe onde o produto mora |

### As cores

Só existem duas de verdade: `--fundo` e `--texto`. Painel, borda, tons
apagados e o roxo saem de `color-mix()` entre elas. É o mesmo desenho que o
`ui/` usa, e é por isso que não existe uma lista de cores por tema para
alguém esquecer de atualizar.

### As três telas

Esfera (hero), galáxia e Terra são o mesmo motor com sementes diferentes.
O que muda é onde os pontos nascem; projeção, rotação e pintura são
idênticas — por isso moram em `pontos.ts` e não copiadas três vezes.

Duas coisas que valem saber antes de mexer:

- **Baldes de opacidade.** O gargalo de um canvas com milhares de pontos não
  é o número de pontos, é a troca de `fillStyle`. Agrupar em 7 baldes faz 7
  trocas por quadro em vez de 14.000.
- **Elas pausam fora da tela.** Um `IntersectionObserver` desliga o
  `requestAnimationFrame` de quem não está visível. Sem isso, as três
  girariam o tempo todo.

Ambas respeitam `prefers-reduced-motion`: quem pediu menos movimento recebe
um quadro estático, sem laço e sem reação ao ponteiro.

## A Terra

Não é um modelo 3D e não usa biblioteca de 3D.

O que o globo precisa saber é uma única resposta, repetida: dado um par
(latitude, longitude), isso é terra ou mar? Com ela, os pontos são gerados
por matemática na hora — do mesmo jeito que a esfera do hero — e o planeta
vira parte do mesmo sistema visual em vez de um corpo estranho.

Então a geografia entra **uma vez, no build**:

```bash
npm run terra
```

`scripts/gerar-terra.mjs` lê as costas do mundo do `world-atlas` (Natural
Earth 110m), projeta em equirretangular com `d3-geo` — que resolve os casos
chatos, como anel cruzando a antimeridiana — e rasteriza com um scanline de
paridade par-ímpar. O resultado é um bitmap de 1 bit por célula, 360×180,
gravado em `src/dados/terra.ts`:

- 8.100 bytes, ~11 KB em base64, pouco mais de 2 KB depois do gzip
- nenhuma das três dependências sobra no bundle (são todas `devDependencies`)

Quer costa mais detalhada? Suba `RESOLUCAO` no script. O custo cresce ao
quadrado, e a 1° por célula os continentes já leem bem em pontilhado.

O que faz o globo parecer sólido e não uma nuvem: o hemisfério de trás é
descartado, a perspectiva é de verdade, há sombreado por ângulo com a luz, e
o eixo tem os 23,44° reais de inclinação.

## A travessia para o I.V.E

A landing é estática e **não fala com a API do modelo**. Ela só entrega o
usuário, e a pergunta que ele já digitou, do outro lado:

```
site (caixa)  ->  ${NEXT_PUBLIC_IVE_URL}/?q=a+pergunta  ->  ui (mesma caixa)
```

Do outro lado, `project-ive/ui/src/App.tsx` lê `?q=`, preenche a caixa, põe o cursor no
fim e **apaga o parâmetro da URL** — sem isso um F5 ressuscitaria a pergunta
antiga por cima do que a pessoa estivesse escrevendo.

Ela não envia sozinha. Toda execução custa tokens e pode esbarrar no servidor
fora do ar; quem aperta enter é a pessoa. Para mudar isso, é uma linha no
`App.tsx`.

## O que ainda não existe

Research, Products, Log in e quase todo o rodapé são casca. Estão
desabilitados e dizem isso no `title`, em vez de fingirem que funcionam — é a
mesma convenção que o app usa na barra lateral. Quando virarem páginas de
verdade, o roteamento por arquivos do Next já dá conta: `src/app/research/`.
