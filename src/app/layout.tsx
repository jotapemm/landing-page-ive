import type { Metadata, Viewport } from "next";
import { Anton, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/*
 * next/font BAIXA a fonte no build e serve do nosso próprio domínio.
 *
 * Isso conserta de graça um problema que o app tem hoje: lá o Anton vem de
 * fonts.googleapis.com em runtime, então com o motor local — que roda
 * offline — a logo cai no fallback do sistema e desmonta. Aqui não há
 * pedido pra fora, e de quebra some o salto de layout do swap tardio.
 */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--fonte-mono",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--fonte-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IDEA. — I.V.E",
  description:
    "I.V.E é um modelo de IA que enxerga a sua tela, entende a tarefa do escritório e executa. Você acompanha cada passo e interrompe quando quiser.",
  openGraph: {
    title: "IDEA. — I.V.E",
    description:
      "Um modelo de IA capaz de te mostrar que seu tempo é mais precioso do que você mesmo imagina.",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f16",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${mono.variable} ${anton.variable}`}>
      <body>
        {/*
          Sem JS não há IntersectionObserver, e os blocos com `.revela`
          ficariam invisíveis para sempre. Aqui o estado escondido é
          desfeito: a página perde as animações e mantém todo o conteúdo.
        */}
        <noscript>
          <style>{`.revela{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
