"use client";

import { enderecoDoIVE } from "@/lib/ive";

/**
 * Anota onde o ponteiro está, em --x/--y do próprio elemento.
 *
 * É daqui que nascem os círculos de `.botao.forte::before` e
 * `.botao.claro::before`: o JS só escreve a coordenada, e quem cresce o
 * círculo é a transição do CSS. Exportada porque os dois botões do
 * cabeçalho usam — duas cópias da mesma função é como o efeito começa a
 * divergir entre eles.
 */
export function seguirPonteiro(e: React.MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}

export function BotaoIVE({ children, className = "", novaAba = false }: {
    children: React.ReactNode;
    className?: string;
    novaAba?: boolean;
}) {
    return (
        <a
            className={`botao forte ${className}`}
            href={enderecoDoIVE()}
            target={novaAba ? "_blank" : undefined}
            rel={novaAba ? "noopener noreferrer" : undefined}
            onMouseMove={seguirPonteiro}
        >
            {/*
              O degradê envolve os filhos AQUI, e não em cada lugar que
              usa o botão: ele aparece no cabeçalho e no fim da página, e
              marcação repetida em dois lugares é como os dois começam a
              divergir. Branco em repouso; o roxo entra pelo
              `.botao:hover .gradient-color` do globals.css, junto com o
              círculo que cresce do cursor.
            */}
            <span className="gradient-color gradient-branco">{children}</span>
        </a>
    );
}