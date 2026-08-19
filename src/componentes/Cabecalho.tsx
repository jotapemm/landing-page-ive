"use client";

/**
 * O cabeçalho.
 *
 * Research e Products são menus que ainda não têm páginas atrás. Em vez de
 * fingirem que funcionam, ficam desabilitados e dizem isso no `title` —
 * é a mesma convenção que o app já usa na barra lateral para Projetar,
 * Desenvolver e Conversas.
 */

import { useEffect, useState } from "react";
import { enderecoDoIVE } from "@/lib/ive";
import css from "./cabecalho.module.css";
import { BotaoIVE } from "./BotaoIVE";

/** A partir de quantos px de rolagem o cabeçalho ganha fundo e borda. */
const LIMIAR = 24;

export function Cabecalho() {
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > LIMIAR);
    aoRolar();
    // passive: este ouvinte nunca chama preventDefault, e avisar disso
    // deixa o navegador rolar sem esperar pelo JS.
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <header className={`${css.cabecalho} ${rolou ? css.rolou : ""}`}>
      <div className={`container ${css.linha}`}>
        {/*
          O "I" e o "." saem em roxo animado; "DEA" fica na cor do texto.
          São três nós e não um por necessidade: `background-clip: text`
          pinta o elemento INTEIRO, então cada trecho de cor precisa da
          própria caixa. O texto lido em voz alta continua sendo "IDEA."
          porque os spans não quebram a palavra.
        */}
        <a href="#topo" className={css.marca}>
          <span className="acento gradient-color">I</span>DEA
          <span className="acento gradient-color">.</span>
        </a>

        {/*
          A palavra vai num <span> POR DENTRO, e não no próprio botão.

          O `.item` zera o fundo com o atalho `background`, e o atalho
          reseta o `background-clip` junto — pintar o botão direto era
          perder o recorte no texto e ficar com a cor chapada. Dentro do
          span não há regra competindo, que é o mesmo motivo de a marca
          ali em cima funcionar. A setinha fica de fora do span de
          propósito: ela é sinal de menu, não palavra.
        */}
        <nav className={css.meio}>
          <button className={css.item} disabled title="Ainda não existe">
            <span className={`${css.pintado} acento gradient-color`}>
              Pesquisa
            </span>{" "}
            <span aria-hidden="true">∨</span>
          </button>
          <a className={`${css.item} ${css.ativo}`} href="#quem">
            <span className={`${css.pintado} acento gradient-color`}>
              I.V.E
            </span>
          </a>
          <button className={css.item} disabled title="Ainda não existe">
            <span className={`${css.pintado} acento gradient-color`}>
              Produtos
            </span>{" "}
            <span aria-hidden="true">∨</span>
          </button>
        </nav>

        <div className={css.direita}>
          <button className="botao" disabled title="Ainda não existe">
            Entrar <span aria-hidden="true">∨</span>
          </button>
          <BotaoIVE novaAba>Teste a I.V.E <span aria-hidden="true">↗</span></BotaoIVE>
        </div>
      </div>
    </header>
  );

}
