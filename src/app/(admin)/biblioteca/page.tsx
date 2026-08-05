import { listBiblioteca, listCategoriasSugeridas } from "@/services/biblioteca.queries";
import { BibliotecaClient } from "./BibliotecaClient";

export const metadata = { title: "Biblioteca" };

export default async function BibliotecaPage() {
  const [conteudos, categoriasSugeridas] = await Promise.all([
    listBiblioteca(),
    listCategoriasSugeridas(),
  ]);
  return <BibliotecaClient initialConteudos={conteudos} categoriasSugeridas={categoriasSugeridas} />;
}
