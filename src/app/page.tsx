import { Cabecalho } from "@/componentes/Cabecalho";
import { CaixaPergunta } from "@/componentes/CaixaPergunta";
import { LogoIVE } from "@/componentes/Logo";
import { Revela } from "@/componentes/Revela";
import { Rodape } from "@/componentes/Rodape";
import { Esfera } from "@/componentes/telas/Esfera";
import { Galaxia } from "@/componentes/telas/Galaxia";
import { Terra } from "@/componentes/telas/Terra";
import { enderecoDoIVE } from "@/lib/ive";
import css from "./pagina.module.css";

const PASSOS = [
  {
    n: "01",
    titulo: "Ele vê a sua tela.",
    texto:
      "Você mostra a tarefa em vez de descrever. Ele identifica o que está na frente dele — a planilha aberta, o boleto, o campo a preencher.",
  },
  {
    n: "02",
    titulo: "Executa no seu lugar.",
    texto:
      "Automático ou passo a passo, por voz ou por texto. O cardápio de ações é fechado: o que não está nele, ele não alcança. Por construção.",
  },
  {
    n: "03",
    titulo: "Você continua no comando.",
    texto:
      "Cada passo aparece enquanto acontece. Se ele pegar o caminho errado, você interrompe no meio — não depois de pronto.",
  },
];

export default function Pagina() {
  return (
    <>
      <Cabecalho />

      <main id="topo">
        {/* --- hero -------------------------------------------------- */}
        <section className={css.hero}>
          <div className={css.palco}>
            <Esfera className={css.telaEsfera} />
            <div className={css.logoHero}>
              <LogoIVE tamanho="clamp(34px, 7.5vw, 72px)" modo="uma-vez" />
            </div>
          </div>

          <div className="container">
            <Revela className={css.centro} atraso={200}>
              <p className={css.chamada}>
                Um modelo de IA que trabalha <span className="acento">na sua tela</span>,
                e não ao lado dela.
              </p>
              <CaixaPergunta />
            </Revela>
          </div>

          <a href="#quem" className={css.desce} aria-label="Ir para a próxima seção">
            <span />
          </a>
        </section>

        {/*
          --- quem é ---------------------------------------------------
          A seção é mais alta que a tela e o conteúdo dentro dela é
          `sticky`. O texto e a galáxia ficam PRESOS no lugar enquanto a
          rolagem atravessa a altura extra — e é durante essa travessia
          que a galáxia acelera. Depois o bloco solta e a página segue.
        */}
        <section className={css.quem} id="quem">
          <div className={css.grude}>
            <div className={css.galaxia} aria-hidden="true">
              <Galaxia />
            </div>

            <div className={`container ${css.quemDentro}`}>
              <Revela>
                <p className="etiqueta">Quem é I.V.E ?</p>
                <h2 className="titulo">
                  Quem é <span className="acento">I.V.E</span>?
                </h2>
              </Revela>

              <Revela atraso={120}>
                <p className={`subtitulo ${css.frase}`}>
                  É um modelo de IA capaz, de te mostrar que seu tempo é mais
                  precioso do que <span className="acento">você</span> mesmo
                  imagina.
                </p>
              </Revela>
            </div>
          </div>
        </section>

        {/* --- como funciona ----------------------------------------- */}
        <section className="secao">
          <div className="container">
            <Revela>
              <p className="etiqueta">Como funciona</p>
              <h2 className="titulo">Três passos, e nenhum deles é seu.</h2>
            </Revela>

            <div className={css.passos}>
              {PASSOS.map((p, i) => (
                <Revela key={p.n} atraso={i * 110} className={css.passo}>
                  <span className={css.numero}>{p.n}</span>
                  <h3 className={css.passoTitulo}>{p.titulo}</h3>
                  <p className={css.passoTexto}>{p.texto}</p>
                </Revela>
              ))}
            </div>
          </div>
        </section>

        {/* --- a terra ----------------------------------------------- */}
        <section className={css.mundo}>
          <div className={css.grude}>
            <div className={`container ${css.mundoGrade}`}>
              <Revela className={css.mundoTexto}>
                <p className="etiqueta">Alcance</p>
                <h2 className="titulo">Um escritório de cada vez.</h2>
                <p className={css.corpo}>
                  O I.V.E começou resolvendo planilha, boleto e CNPJ de um
                  escritório contábil brasileiro. A tarefa muda de país, de
                  idioma e de setor. O jeito de resolver, não.
                </p>
                <p className={css.rodapeTexto}>
                  Arraste o planeta para girar em qualquer direção.
                </p>
              </Revela>

              <div className={css.globo}>
                <Terra />
              </div>
            </div>
          </div>
        </section>

        {/* --- chamada final ----------------------------------------- */}
        <section className={`secao ${css.final}`}>
          <div className="container">
            <Revela className={css.centro}>
              <h2 className="titulo">
                Comece pela pergunta que você faria a um estagiário.
              </h2>
              <p className={css.corpo}>
                Ele responde, mostra o que fez e espera a sua ordem para o
                resto.
              </p>
              <a
                className={`botao forte ${css.botaoGrande}`}
                href={enderecoDoIVE()}
              >
                Teste a I.V.E <span aria-hidden="true">↗</span>
              </a>
            </Revela>
          </div>
        </section>
      </main>

      <Rodape />
    </>
  );
}
