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
        <a href="#topo" className={css.marca}>
          IDEA.
        </a>

        <nav className={css.meio}>
          <button className={css.item} disabled title="Ainda não existe">
            Pesquisa <span aria-hidden="true">∨</span>
          </button>
          <a className={`${css.item} ${css.ativo}`} href="#quem">
            I.V.E
          </a>
          <button className={css.item} disabled title="Ainda não existe">
            Produtos <span aria-hidden="true">∨</span>
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
