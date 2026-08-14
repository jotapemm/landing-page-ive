import { enderecoDoIVE } from "@/lib/ive";
import css from "./rodape.module.css";

/*
 * Quase tudo aqui ainda não existe. Os itens sem página são <span>, e não
 * <a href="#">: link que não leva a lugar nenhum quebra a navegação por
 * teclado e mente para o leitor de tela.
 */
const COLUNAS = [
  {
    titulo: "Produto",
    itens: [
      { rotulo: "I.V.E", href: enderecoDoIVE() },
      { rotulo: "Preços" },
      { rotulo: "Mudanças" },
    ],
  },
  {
    titulo: "Pesquisa",
    itens: [{ rotulo: "Sobre o modelo" }, { rotulo: "Segurança" }],
  },
  {
    titulo: "IDEA.",
    itens: [{ rotulo: "Contato" }, { rotulo: "Termos" }],
  },
];

export function Rodape() {
  return (
    <footer className={css.rodape}>
      <div className={`container ${css.grade}`}>
        <div className={css.marca}>
          <div className={css.nome}>IDEA.</div>
          <p className={css.linha}>
            Automação de tarefas de escritório, em português.
          </p>
        </div>

        {COLUNAS.map((c) => (
          <div key={c.titulo}>
            <h3 className={css.titulo}>{c.titulo}</h3>
            <ul className={css.lista}>
              {c.itens.map((i) => (
                <li key={i.rotulo}>
                  {i.href ? (
                    <a href={i.href}>{i.rotulo}</a>
                  ) : (
                    <span title="Ainda não existe">{i.rotulo}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`container ${css.base}`}>
        <span>© {new Date().getFullYear()} IDEA.</span>
        <span>Feito no Brasil.</span>
      </div>
    </footer>
  );
}
