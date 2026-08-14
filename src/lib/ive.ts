/**
 * A ponte entre a landing e o produto.
 *
 * Este arquivo é o ÚNICO lugar que sabe onde o I.V.E mora. A landing é
 * estática e não fala com a API do modelo — ela só entrega o usuário, e a
 * pergunta que ele já digitou, do outro lado.
 *
 * É o mesmo movimento de openai.com -> chatgpt.com: você começa a escrever
 * na vitrine e termina dentro do produto, sem redigitar.
 *
 * O endereço vem de NEXT_PUBLIC_IVE_URL. Sendo NEXT_PUBLIC_, o Next troca
 * pela string no BUILD — então cada ambiente (local, staging, produção)
 * sai num bundle próprio, e não existe leitura em runtime para dar errado.
 */

export const IVE_URL =
  process.env.NEXT_PUBLIC_IVE_URL ?? "http://localhost:5173";

/**
 * Monta o endereço do app, levando a pergunta junto quando existe.
 *
 * Do outro lado, ui/src/App.tsx lê `?q=` e já deixa a caixa preenchida.
 * Ele NÃO envia sozinho: cada execução custa tokens e pode pegar o
 * servidor fora do ar, então quem aperta enter é o usuário.
 */
export function enderecoDoIVE(pergunta?: string): string {
  try {
    const url = new URL(IVE_URL);
    const limpa = pergunta?.trim();
    if (limpa) url.searchParams.set("q", limpa);
    return url.toString();
  } catch {
    // NEXT_PUBLIC_IVE_URL veio torto (faltou o http://, por exemplo).
    // Melhor mandar pra raiz do que quebrar o clique.
    return IVE_URL;
  }
}
