"use client";

/**
 * Aparece quando entra na tela.
 *
 * O estado escondido já vem no HTML (classe `revela`), e não é adicionado
 * depois pelo JS — senão o bloco piscaria visível antes de sumir para
 * então reaparecer. Quem não tem JS é atendido pelo <noscript> no layout,
 * que reescreve `.revela` para o estado final. Página sem JS mostra o
 * texto; ela só não anima.
 *
 * `once`: o observador se desliga assim que revela. Um bloco que some e
 * volta a cada rolagem cansa, e ainda faz o navegador trabalhar à toa.
 */

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

export function Revela({
  children,
  atraso = 0,
  className = "",
  como: Tag = "div",
  ...resto
}: {
  children: ReactNode;
  /** Atraso da transição, em ms — para escalonar blocos vizinhos. */
  atraso?: number;
  className?: string;
  como?: ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setVisivel(true);
        io.disconnect();
      },
      // Só conta como "entrou" depois de 60px dentro da viewport: revelar
      // no primeiro pixel faz a animação acontecer fora do campo de visão.
      { rootMargin: "-60px 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      {...resto}
      ref={ref}
      className={`revela ${visivel ? "visivel" : ""} ${className}`}
      style={atraso ? ({ "--atraso": `${atraso}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
