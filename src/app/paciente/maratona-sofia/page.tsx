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
const quinta=[
["Café da manhã",["Pão francês 75 g (1½ unidade)","Banana 120 g","Mel 20 g","Geleia sem açúcar 30 g"]],
["Lanche da manhã",["Pão francês 75 g (1½ unidade)","Geleia sem açúcar 25 g","Suco de laranja coado, sem açúcar, 250 ml"]],
["Almoço",["Arroz branco cozido 250 g","Frango cozido 80 g","Cenoura cozida 80 g","Azeite 5 g"]],
["Lanche da tarde",["Pão francês 75 g (1½ unidade)","Banana 100 g","Mel 25 g"]],
["Jantar",["Macarrão cozido 350 g","Molho de tomate suave 100 g","Frango cozido 80 g","Azeite 5 g"]]
] as const;
const sexta=[
["Café da manhã",["Pão francês 100 g (2 unidades)","Banana 120 g","Mel 20 g","Geleia sem açúcar 30 g"]],
["Lanche da manhã",["Pão francês 75 g (1½ unidade)","Geleia sem açúcar 25 g","Suco de laranja coado, sem açúcar, 250 ml"]],
["Almoço",["Arroz branco cozido 350 g","Frango cozido 80 g","Cenoura cozida 80 g","Azeite 5 g"]],
["Lanche da tarde",["Pão francês 100 g (2 unidades)","Banana 100 g","Mel 25 g"]],
["Jantar",["Macarrão cozido 350 g","Molho de tomate suave 100 g","Frango cozido 80 g","Azeite 5 g"]],
["Ceia",["Pão francês 50 g (1 unidade)","Geleia sem açúcar 30 g"]]
] as const;
const sabado=[
...sexta.slice(0,4),
["Jantar especial — NHOQUE",["Nhoque de batata cozido 300 g","Molho de tomate suave 100 g","Frango desfiado 80 g","Azeite 5 g"]],
sexta[5]
] as const;
const resumo={
"12/11 • Quinta":{kcal:2279,carbo:429,proteina:97,gordura:24},
"13/11 • Sexta":{kcal:2744,carbo:529,proteina:110,gordura:27},
"14/11 • Sábado":{kcal:2856,carbo:551,proteina:106,gordura:28}
} as const;
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
["12/11 • Quinta","Aumento inicial • cerca de 429 g de carboidratos",quinta],
["13/11 • Sexta","Carga de carboidratos • cerca de 529 g",sexta],
["14/11 • Sábado","Véspera — nhoque no jantar • cerca de 551 g",sabado],
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
<section className="bg-amber-50 rounded-2xl p-5 text-sm"><strong>Plano especial para avaliação nutricional</strong><p className="mt-2">As porções são uma proposta baseada na alimentação atual e não substituem a avaliação clínica. Nos dias 13–14/11, os cardápios calculados fornecem aproximadamente 529 g e 551 g de carboidratos (8,8 e 9,2 g/kg para 60 kg). Na quinta, aproximadamente 429 g. São estimativas para marcas e alimentos padronizados, com necessidade de conferir rótulos do nhoque, geleia, pães e preparações; a ingestão pode ser reduzida se ocorrer distensão ou desconforto. Ajustar volume e alimentos à tolerância nos treinos. Evitar testes novos na prova. O plano alimentar habitual permanece separado.</p></section>

<section className="rounded-2xl border p-5 space-y-4">
<h2 className="text-2xl font-bold">Como seguir esta semana — passo a passo</h2>
<p className="text-sm">Sofia, o objetivo desta semana é chegar à largada descansada, alimentada e hidratada. Você não precisa comer tudo de uma vez nem exagerar na água. Siga as refeições dos cards de cada dia e use estes cuidados:</p>
<div className="grid gap-3 md:grid-cols-2">
{[
["Segunda a quarta • 09–11/11","Mantenha as refeições indicadas e os horários que funcionam para você. Coma o pré-treino quando houver treino; em dias sem treino, reorganize esse alimento como lanche. Não faça restrição alimentar para compensar treinos mais leves. Evite álcool em excesso e priorize o sono."],
["Quinta • 12/11","Comece a aumentar as porções de arroz, pão, massas e frutas conforme os cards. O foco passa a ser estocar energia. Não é necessário comer grandes volumes de salada; use os vegetais cozidos que você tolera."],
["Sexta • 13/11","Distribua os carboidratos em várias refeições para não ficar estufada. Prefira preparações simples e conhecidas, com menos frituras e alimentos muito fibrosos. Separe os géis, roupas e garrafas da prova."],
["Sábado • 14/11","Faça café da manhã, lanche, almoço e lanche da tarde normalmente; não passe fome para guardar espaço para o jantar. O jantar será nhoque de batata com molho suave e frango, de preferência entre 18h e 19h30. Não experimente receitas, bebidas ou suplementos novos."],
["Domingo • 15/11","Planeje acordar com antecedência para comer cerca de 2 a 3 horas antes da largada. Use apenas o que já tolera. Na corrida, consulte a tabela de géis e beba água nos postos conforme sede e estratégia testada. Após chegar, hidrate-se e faça uma refeição de recuperação."]
].map(([t,d])=><article key={t} className="bg-stone-50 rounded-xl p-4"><h3 className="font-bold">{t}</h3><p className="text-sm mt-2">{d}</p></article>)}
</div>
</section>
<section className="rounded-2xl bg-sky-50 p-5 space-y-3">
<h2 className="text-2xl font-bold">Água nos dias anteriores</h2>
<p className="text-sm">Como ponto de partida para seus 60 kg, procure consumir <strong>aproximadamente 2,0 a 2,4 litros de bebidas ao longo do dia</strong>, distribuídos desde a manhã. É uma meta prática inicial, não um mínimo obrigatório nem um limite: calor, atividade física, sede, suor e outros líquidos consumidos mudam a necessidade. Não force água se já estiver bem hidratada.</p>
<ul className="list-disc pl-5 space-y-1 text-sm">
<li><strong>09–11/11:</strong> use uma garrafa de 500 ml como referência: cerca de 4 garrafas ao longo do dia, ajustando à sede, urina e treinamento.</li>
<li><strong>12–13/11:</strong> mantenha a mesma regularidade; se houver treino e muita sudorese, reponha também as perdas associadas ao exercício.</li>
<li><strong>14/11:</strong> mantenha cerca de 2,0–2,4 L de bebidas ao longo do dia, conforme sede. Não tente beber vários litros à noite para “acumular” água.</li>
<li><strong>15/11 antes da prova:</strong> cerca de 300–600 ml entre 2 e 4 horas antes da largada é uma referência baseada no peso, fracionada conforme conforto; evite beber demais de uma vez.</li>
<li><strong>Durante a corrida:</strong> beba de acordo com a sede, clima, experiência nos longões e pontos de apoio. Não é seguro impor um volume fixo sem conhecer a taxa de suor.</li>
</ul>
<p className="text-sm">Um sinal útil é urinar regularmente, geralmente em coloração amarelo-clara. Urina totalmente transparente o dia inteiro não é uma meta. Se houver recomendação médica de restrição de líquidos, ela prevalece.</p>
</section>
<section className="space-y-4"><h2 className="text-2xl font-bold">Cardápio completo • 7 dias</h2>{dias.map(([data,sub,refeicoes],i)=><details key={data} open={i===5||i===6} className="rounded-2xl overflow-hidden border bg-white"><summary className="cursor-pointer bg-stone-100 p-5"><strong>{data}</strong><p className="text-sm mt-1">{sub}</p>{data in resumo && <p className="text-sm mt-2 font-semibold">Estimativa diária: {resumo[data as keyof typeof resumo].kcal} kcal • {resumo[data as keyof typeof resumo].carbo} g carboidratos • {resumo[data as keyof typeof resumo].proteina} g proteínas • {resumo[data as keyof typeof resumo].gordura} g gorduras</p>}</summary><div className="grid md:grid-cols-2 gap-3 p-4">{refeicoes.map(([n,itens],k)=><article key={k} className="rounded-xl border p-4"><h3 className="font-bold mb-2">{n}</h3><ul className="list-disc pl-5 text-sm space-y-1">{itens.map((a,j)=><li key={j}>{a}</li>)}</ul></article>)}</div></details>)}</section>
<section className="rounded-2xl border p-5"><h2 className="text-2xl font-bold">Géis e cafeína na maratona</h2><p className="text-sm mt-2">Exemplo distribuído de 263 g de carboidratos (62,3 g/h) e 175 mg de cafeína (2,9 mg/kg). Contabilizar café antes da largada e bebidas esportivas. Só executar se essas doses e intervalos foram testados e bem tolerados nos longões.</p><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead className="bg-stone-100"><tr><th className="p-3 text-left">Tempo</th><th className="p-3 text-left">Gel</th><th className="p-3">CHO</th><th className="p-3">Cafeína</th></tr></thead><tbody>{gels.map(([hora,n,cho,caf],i)=><tr className="border-t" key={i}><td className="p-3">{hora}</td><td className="p-3">{n}</td><td className="p-3 text-center">{cho} g</td><td className="p-3 text-center">{caf} mg</td></tr>)}</tbody></table></div><p className="mt-3 text-sm">Estoque para o exemplo: 4 Carbs 40 sem cafeína, 3 Maracujá, 1 Guaraná e 1 BT400 NIT. Carbs 40 com cafeína (180 mg) é alternativa, não adicional: não somar sem recalcular cafeína e carboidratos. Conferir valores dos rótulos e quantidade disponível.</p></section>
<section className="bg-stone-100 rounded-2xl p-5"><h2 className="text-xl font-bold">Hidratação e cápsulas de sal</h2><p className="text-sm mt-2">Cápsula de sal: produto disponível; confirme a marca e os mg de sódio por cápsula antes de definir dose e horário. Não há posologia prescrita até essa conferência. É necessário confirmar marca e mg de sódio por cápsula; considerar sódio dos géis, bebidas e postos de abastecimento, além da taxa de suor, clima e tolerância. Não tomar cápsulas automaticamente por hora, nem forçar água em excesso. Gel GO! Recovery pode ser utilizado na recuperação conforme rótulo e necessidade, sem substituir refeição completa.</p></section>
<footer className="text-xs text-slate-500 border-t pt-4">Macronutrientes estimados por tabelas alimentares e valores de referência; nhoque e molho dependem da receita. Os totais calóricos são aproximações e podem divergir dos calculados pelos fatores 4/4/9. Conferir tolerância e marcas com o nutricionista antes da prova.</footer>
</main>;
}