"use client";

import { Revela } from "./Revela";
import css from "@/app/pagina.module.css";

export function Passo({ n, titulo, texto, atraso}: {
    n: string; titulo: string; texto: string; atraso: number;
}) {
    return (
        <Revela
        atraso={atraso}
        className={css.passo}
        onMouseMove={(e) => {
            const r =
            e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--x" , `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
        }}
        >
            <span className={css.numero}>{n}</span>
            <h3 className={css.passoTitulo}>{titulo}</h3>
            <p className={css.passoTexto}>{texto}</p>
        </Revela>
    );
}