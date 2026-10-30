import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const metadata = { title: "Maratona de Curitiba | Sofia" };
const sessoes = [
["30 min","Dobro Carbs 40 (sem cafeína)","40 g"],
["60 min","Dobro Carbs Maracujá","21 g"],
["90 min","Dobro Carbs 40 (sem cafeína)","40 g"],
["120 min","Dobro Carbs Maracujá","21 g"],
["150 min","Dobro Carbs 40 (sem cafeína)","40 g"],
["180 min","Dobro Carbs Maracujá","21 g"],
["210 min","Dobro Carbs 40 (sem cafeína)","40 g"],
["240 min","Dobro Carbs 40 (sem cafeína)","40 g"],
];
export default async function MaratonaSofia() {
 const sb = await createClient();
 const {data:{user}} = await sb.auth.getUser();
 if (!user) redirect("/paciente/login");
 if (user.id !== "856fb8c0-8972-456e-8cb5-6602a25faeee") redirect("/paciente");
 return <main className="mx-auto max-w-3xl px-5 py-10 text-slate-800 space-y-7">
 <a href="/paciente" className="text-sm underline">← Área do paciente</a>
 <header className="rounded-3xl bg-emerald-950 p-7 text-white"><p className="text-emerald-200">Sofia Romay Oliveira • Protocolo individual para revisão clínica</p><h1 className="text-3xl font-bold mt-2">Maratona de Curitiba</h1><p className="mt-3">15/11/2026 • 42,195 km • Pace de referência 6:00/km • Tempo previsto 4h13min10s</p></header>
 <section><h2 className="text-xl font-bold mb-2">Semana de prova</h2><p>Até 11/11: manter o plano alimentar habitual e adequar carboidratos à carga de treino, sem restrição calórica agressiva. De 12 a 14/11: priorizar abastecimento de glicogênio. Para 60 kg, a referência de 8–10 g/kg/dia equivale a 480–600 g de carboidratos/dia nas 36–48 h finais, somente conforme tolerância e validação profissional. Reduzir excessos de fibras e gorduras nas últimas 24–48 h.</p></section>
 <section className="rounded-2xl bg-stone-100 p-5"><h2 className="text-xl font-bold">Sábado 14/11 — jantar: nhoque</h2><p className="mt-2">Nhoque de batata cozido 300 g + molho de tomate suave 100 g + frango desfiado 80 g + azeite 5 g. Quantidades iniciais, sujeitas ao rótulo/receita e tolerância gastrointestinal; não usar os valores calóricos anteriores como cálculo fechado. Preferir preparo conhecido e jantar por volta de 18h–19h30. Não testar alimentos novos.</p></section>
 <section><h2 className="text-xl font-bold">Domingo 15/11 — antes de correr</h2><p>Café da manhã aproximadamente 2–3 h antes da largada, com 60–120 g de carboidratos conforme tolerância, por exemplo pão branco, geleia e banana, com água. Ajustar horário à largada oficial e à rotina treinada.</p></section>
 <section><h2 className="text-xl font-bold">Durante a maratona — planejamento base</h2><p>Meta inicial de 60–70 g de carboidratos/h. Esquema abaixo totaliza 263 g em 4h13 (~62,3 g/h), sem cafeína adicionada. Confirmar os rótulos, disponibilidade dos 5 sachês Carbs 40 sem cafeína e 3 sachês Maracujá, tolerância e abastecimento nos postos antes de executar.</p>
 <div className="mt-4 overflow-x-auto rounded-2xl border"><table className="w-full text-sm"><thead className="bg-stone-100"><tr><th className="p-3 text-left">Momento</th><th className="p-3 text-left">Gel</th><th className="p-3 text-right">CHO</th></tr></thead><tbody>{sessoes.map((s,i)=><tr key={i} className="border-t"><td className="p-3">{s[0]}</td><td className="p-3">{s[1]}</td><td className="p-3 text-right">{s[2]}</td></tr>)}</tbody></table></div></section>
 <section><h2 className="text-xl font-bold">Outros suplementos disponíveis</h2><p>Dobro Guaraná: 20 g CHO e 75 mg cafeína; Dobro BT400 NIT: 20 g CHO e 100 mg cafeína; Dobro Carbs 40 com cafeína: 40 g CHO e 180 mg cafeína; Dobro Carbs 40 sem cafeína: 40 g CHO; Dobro Maracujá: 21 g CHO. Gel GO! Recovery: 85 mg sódio e 60 mg potássio no rótulo frontal (carboidratos a confirmar). Não substituir géis sem recalcular carboidratos e cafeína total.</p></section>
 <section><h2 className="text-xl font-bold">Hidratação e recuperação</h2><p>Hidratar-se conforme sede, condições climáticas, perdas de suor e experiência nos longões; evitar excesso de água e considerar o sódio de bebidas e suplementos. Após a chegada: líquidos, refeição com carboidratos e aproximadamente 20–40 g de proteína conforme tolerância. O GO! Recovery não substitui refeição sem conferir composição.</p></section>
 <footer className="border-t pt-5 text-sm text-slate-500">Material orientativo de prova. Confirmar detalhes com seu nutricionista; manter o plano alimentar habitual nas demais refeições. Não é recomendação para testar novos produtos no dia da corrida.</footer>
 </main>;
}