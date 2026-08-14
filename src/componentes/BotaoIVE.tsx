"use client";

import { enderecoDoIVE } from "@/lib/ive";

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
            onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
            }}
        >
            {children}
        </a>
    );
}