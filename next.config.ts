import type { NextConfig } from "next";

/*
 * A landing é estática: não tem servidor, não tem banco, não chama a API do
 * IVE. Tudo que ela precisa saber do produto é PARA ONDE mandar o usuário —
 * e isso é uma variável de ambiente, não código.
 *
 * `output: "export"` deixa o `npm run build` cuspir HTML puro em out/, que
 * sobe em qualquer lugar (Vercel, Netlify, GitHub Pages, um bucket S3).
 * Se um dia a landing precisar de servidor — formulário de contato, blog com
 * revalidação — é só apagar esta linha.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
