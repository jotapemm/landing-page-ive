"use client";

/**
 * A caixa de pergunta do hero.
 *
 * Ela é deliberadamente IGUAL à caixa que existe dentro do app: mesma
 * marca `>.` no pé, mesmo botão de enviar, mesmo placeholder. A pessoa
 * escreve aqui, atravessa para o produto e reencontra o texto dela na
 * mesma caixa — a passagem não parece uma troca de site, parece a mesma
 * conversa continuando.
 *
 * O que ela NÃO faz: falar com a API. A landing é estática. Enviar aqui é
 * navegar para o app levando `?q=` junto.
 */

import { useRef, useState } from "react";
import { enderecoDoIVE } from "@/lib/ive";
import css from "./caixa.module.css";

const SUGESTOES = [
  "quantas linhas tem a planilha clientes_agosto?",
  "confere os e-mails da coluna E-mail",
  "quais boletos vencem essa semana?",
];

export function CaixaPergunta() {
  const [texto, setTexto] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  function mandar() {
    // Sem texto o botão está desabilitado, mas o Enter ainda chega aqui.
    if (!texto.trim()) return;
    window.location.href = enderecoDoIVE(texto);
  }

  function sugerir(s: string) {
    setTexto(s);
    area.current?.focus();
  }

  return (
    <div className={css.bloco}>
      <div className={css.caixa}>
        <textarea
          ref={area}
          className={css.campo}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter envia, Shift+Enter quebra linha — a mesma regra do app.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              mandar();
            }
          }}
          placeholder="Como posso te ajudar?"
          rows={1}
          aria-label="Escreva sua pergunta para o I.V.E"
        />
        <div className={css.pe}>
          <span className={css.marca} aria-hidden="true">
            &gt;.
          </span>
          <div className={css.controles}>
            <span className={css.dica}>modelo · conversa por voz</span>
            <button
              className={css.enviar}
              onClick={mandar}
              disabled={!texto.trim()}
              aria-label="Abrir o I.V.E com esta pergunta"
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      <div className={css.sugestoes}>
        {SUGESTOES.map((s) => (
          <button key={s} className={css.sugestao} onClick={() => sugerir(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
