import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const metadata={title:"Dashboard • Semana da Maratona | Sofia"};
const base=[
["Café da manhã",["Pão integral 75 g","2 ovos cozidos (100 g)","Banana 80 g","Mel 15 g","Creme de ricota 20 g"]],
["Lanche da manhã",["Iogurte desnatado 170 g","Banana 80 g","Aveia 10 g"]],
["Almoço",["Arroz branco cozido 150 g","Feijão cozido 80 g","Peito de frango 100 g","Cenoura cozida 100 g","Azeite 5 g"]],
["Pré-treino / lanche energético",["Pão integral 50 g","Doce de leite 30 g","Banana 80 g"]],
["Lanche da tarde",["Pão integral 75 g","Frango desfiado 50 g","Creme de ricota 20 g","Maçã 130 g"]],
["Jantar",["Arroz branco cozido 150 g","Peito de frango 90 g","Cenoura cozida 100 g","Azeite 5 g"]],
["Ceia substitutiva — somente se pulou o lanche da manhã",["Iogurte 170 g","Aveia 20 g","Banana 50 g"]]
] as const;
const carga=[
["Café da manhã",["Pão branco 150 g","Geleia 40 g","Banana 120 g","Mel 20 g"]],
["Lanche da manhã",["Pão branco 100 g","Geleia 30 g","Suco de fruta coado 250 ml"]],
["Almoço",["Arroz branco cozido 300 g","Peito de frango 80 g","Cenoura bem cozida 80 g","Azeite 5 g"]],
["Lanche da tarde",["Pão branco 100 g","Mel 30 g","Banana 100 g"]],
["Jantar",["Macarrão cozido 300 g","Molho de tomate suave 100 g","Frango 80 g","Azeite 5 g"]],
["Ceia opcional",["Pão branco 50 g","Geleia 25 g"]]
] as const;
const sabado=carga.map(([nome,itens])=>nome==="Jantar"?["Jantar especial — NHOQUE",["Nhoque de batata cozido 300 g","Molho de tomate suave 100 g","Peito de frango desfiado 80 g","Azeite 5 g"]]:[nome,[...itens]]) as [string,string[]][];
const prova=[
["02h–02h30 • Café da manhã",["Pão branco 100 g","Geleia 30 g","Banana 80 g","Água conforme sede (quantidade individual)"]],
["05h • Largada",["Conferir horário oficial e acesso aos postos de água"]],
["Durante a prova",["Seguir programação de géis abaixo","Água conforme sede e plano de hidratação testado"]],
["Após a chegada",["Repor líquidos conforme perdas","Carboidratos e 20–40 g de proteínas conforme tolerância"]]
] as [string,string[]][];
const dias=[
["09/11 • Segunda","Rotina habitual / reduzir cargas conforme treino",base],
["10/11 • Terça","Rotina habitual / recuperar bem",base],
["11/11 • Quarta","Rotina habitual / evitar déficit calórico",base],
["12/11 • Quinta","Aumentar carboidratos progressivamente",carga],
["13/11 • Sexta","Foco no glicogênio e conforto digestivo",carga],
["14/11 • Sábado","Véspera — nhoque no jantar",sabado],
["15/11 • Domingo","MARATONA — largada e recuperação",prova]
] as const;
const gels=[
["00h20","Carbs 40 sem cafeína",40,0],
["00h50","Carbs Maracujá",21,0],
["01h20","Carbs 40 sem cafeína",40,0],
["01h50","Carbs 40 sem cafeína",40,0],
["02h20","Guaraná",20,75],
["02h50","Carbs 40 sem cafeína",40,0],
["03h20","BT400 NIT",20,100],
["03h40","Carbs Maracujá",21,0],
["04h00","Carbs Maracujá",21,0]
] as const;
export default async function Page(){
const client=await createClient();
const {data:{user}}=await client.auth.getUser();
if(!user)redirect("/paciente/login");
if(user.id!=="856fb8c0-8972-456e-8cb5-6602a25faeee")redirect("/paciente");
return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-slate-800">
<a href="/paciente" className="underline text-sm">← Voltar à área do paciente</a>
<header className="rounded-3xl bg-emerald-950 text-white p-7"><p className="text-emerald-200 text-sm">SOFIA ROMAY OLIVEIRA</p><h1 className="text-3xl font-bold mt-2">Dashboard da semana da maratona</h1><p className="mt-2">Curitiba • 09 a 15 de novembro de 2026</p><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">{[["Peso de referência","60 kg"],["Prova","42,195 km"],["Pace","6:00 min/km"],["Previsão","4h13min"]].map(([a,b])=><div className="bg-white/10 rounded-xl p-3" key={a}><p className="text-xs text-emerald-200">{a}</p><strong>{b}</strong></div>)}</div></header>
<section className="bg-amber-50 rounded-2xl p-5 text-sm"><strong>Plano especial para avaliação nutricional</strong><p className="mt-2">As porções são uma proposta baseada na alimentação atual e não substituem a avaliação clínica. Nos dias 13–14/11, uma referência possível é 8–10 g/kg/dia (480–600 g de carboidratos), mas os cardápios abaixo não foram validados para atingir exatamente essa faixa. Ajustar volume e alimentos à tolerância nos treinos. Evitar testes novos na prova. O plano alimentar habitual permanece separado.</p></section>
<section className="space-y-4"><h2 className="text-2xl font-bold">Cardápio completo • 7 dias</h2>{dias.map(([data,sub,refeicoes],i)=><details key={data} open={i===5||i===6} className="rounded-2xl overflow-hidden border bg-white"><summary className="cursor-pointer bg-stone-100 p-5"><strong>{data}</strong><p className="text-sm mt-1">{sub}</p></summary><div className="grid md:grid-cols-2 gap-3 p-4">{refeicoes.map(([n,itens],k)=><article key={k} className="rounded-xl border p-4"><h3 className="font-bold mb-2">{n}</h3><ul className="list-disc pl-5 text-sm space-y-1">{itens.map((a,j)=><li key={j}>{a}</li>)}</ul></article>)}</div></details>)}</section>
<section className="rounded-2xl border p-5"><h2 className="text-2xl font-bold">Géis e cafeína na maratona</h2><p className="text-sm mt-2">Exemplo distribuído de 263 g de carboidratos (62,3 g/h) e 175 mg de cafeína (2,9 mg/kg). Contabilizar café antes da largada e bebidas esportivas. Só executar se essas doses e intervalos foram testados e bem tolerados nos longões.</p><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead className="bg-stone-100"><tr><th className="p-3 text-left">Tempo</th><th className="p-3 text-left">Gel</th><th className="p-3">CHO</th><th className="p-3">Cafeína</th></tr></thead><tbody>{gels.map(([hora,n,cho,caf],i)=><tr className="border-t" key={i}><td className="p-3">{hora}</td><td className="p-3">{n}</td><td className="p-3 text-center">{cho} g</td><td className="p-3 text-center">{caf} mg</td></tr>)}</tbody></table></div><p className="mt-3 text-sm">Estoque para o exemplo: 4 Carbs 40 sem cafeína, 3 Maracujá, 1 Guaraná e 1 BT400 NIT. Carbs 40 com cafeína (180 mg) é alternativa, não adicional: não somar sem recalcular cafeína e carboidratos. Conferir valores dos rótulos e quantidade disponível.</p></section>
<section className="bg-stone-100 rounded-2xl p-5"><h2 className="text-xl font-bold">Hidratação e cápsulas de sal</h2><p className="text-sm mt-2">Cápsula de sal: opção disponível, mas dose e horário NÃO prescritos. É necessário confirmar marca e mg de sódio por cápsula; considerar sódio dos géis, bebidas e postos de abastecimento, além da taxa de suor, clima e tolerância. Não tomar cápsulas automaticamente por hora, nem forçar água em excesso. Gel GO! Recovery pode ser utilizado na recuperação conforme rótulo e necessidade, sem substituir refeição completa.</p></section>
<footer className="text-xs text-slate-500 border-t pt-4">Revisar com o nutricionista antes da prova. Quantidades e macronutrientes de preparações variam conforme marcas, receitas e cocção.</footer>
</main>;
}