import { CheckCircle2, ClipboardCheck, LockKeyhole } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { responderFormularioAction } from "@/services/public-form.actions";

export const metadata = { title: "Formulário | Nutri Thales Rosa" };

export default async function FormularioPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = createAdminClient() as any;

  const { data: envio } = await supabase
    .from("formulario_envios")
    .select("id,status,expira_em,visualizado_em,respondido_em, formulario:formularios(id,nome,descricao,tipo,exibir_score,score_descricao), paciente:pacientes(id,nome)")
    .eq("token", token)
    .maybeSingle();

  const status = Array.isArray(query.status) ? query.status[0] : query.status;
  const erro = Array.isArray(query.erro) ? query.erro[0] : query.erro;

  if (!envio) return <PublicMessage title="Link inválido" text="Este formulário não foi encontrado." />;

  if (status === "sucesso" || envio.status === "respondido") {
    const { data: resposta } = await supabase
      .from("formulario_respostas")
      .select("pontuacao")
      .eq("envio_id", envio.id)
      .maybeSingle();

    return (
      <PublicMessage
        success
        title="Check-in concluído!"
        text="Suas respostas já foram registradas e estarão disponíveis para o Thales revisar."
        score={envio.formulario.exibir_score ? resposta?.pontuacao ?? null : null}
        scoreText={envio.formulario.score_descricao}
      />
    );
  }

  if (envio.status === "cancelado" || envio.status === "expirado" || new Date(envio.expira_em).getTime() < Date.now()) {
    return <PublicMessage title="Formulário indisponível" text="Este link expirou ou foi cancelado. Solicite um novo envio." />;
  }

  if (!envio.visualizado_em) {
    await supabase
      .from("formulario_envios")
      .update({ status: envio.status === "enviado" ? "visualizado" : envio.status, visualizado_em: new Date().toISOString() })
      .eq("id", envio.id);
  }

  const { data: perguntas } = await supabase
    .from("formulario_perguntas")
    .select("id,ordem,chave,titulo,descricao,tipo,obrigatoria,opcoes,minimo,maximo,peso,icone")
    .eq("formulario_id", envio.formulario.id)
    .eq("exibir", true)
    .order("ordem", { ascending: true });

  const action = responderFormularioAction.bind(null, token);

  return (
    <main className="min-h-screen bg-[#f5f6f2] px-4 py-8 text-[#17201b] sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 rounded-[28px] bg-[#17201b] p-6 text-white shadow-sm sm:p-8">
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1adc7f] text-[#17201b]">
            <ClipboardCheck size={22} />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#1adc7f]">Nutri Thales Rosa</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{envio.formulario.nome}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
            {envio.formulario.descricao || "Responda com calma. Suas respostas serão usadas no seu acompanhamento nutricional."}
          </p>
          {envio.paciente?.nome && <p className="mt-5 text-sm font-semibold">Olá, {envio.paciente.nome.split(" ")[0]}.</p>}
        </header>

        {erro && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro === "obrigatorio" ? "Preencha todas as perguntas obrigatórias antes de enviar." : "Não foi possível salvar sua resposta. Tente novamente."}
          </div>
        )}

        <form action={action} className="space-y-4">
          {(perguntas ?? []).map((pergunta: any, index: number) => (
            <section key={pergunta.id} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-xl bg-[#e7fff3] text-xs font-bold text-[#0a7c48]">{index + 1}</span>
                    <h2 className="font-bold leading-6">{pergunta.titulo}</h2>
                    {pergunta.obrigatoria && <span className="text-[#0a7c48]">*</span>}
                  </div>
                  {pergunta.descricao && <p className="mt-3 text-sm leading-6 text-black/65">{pergunta.descricao}</p>}
                </div>
                {pergunta.peso > 0 && <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-black/45">Peso {pergunta.peso}</span>}
              </div>
              <QuestionField pergunta={pergunta} />
            </section>
          ))}

          {envio.formulario.exibir_score && (
            <div className="rounded-2xl border border-[#b8efce] bg-[#effcf4] p-4 text-sm text-[#217443]">
              <p className="font-semibold">Score final</p>
              <p className="mt-1 leading-5">Ao concluir, você verá sua pontuação geral deste check-in.</p>
            </div>
          )}

          <button type="submit" className="w-full rounded-2xl bg-[#17201b] px-5 py-4 text-base font-bold text-white transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-[#1adc7f]/30">
            Concluir check-in
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-black/45">
          <LockKeyhole size={14} /> Link individual e protegido para este acompanhamento.
        </div>
      </div>
    </main>
  );
}

function QuestionField({ pergunta }: { pergunta: any }) {
  const common = { id: pergunta.chave, name: pergunta.chave, required: Boolean(pergunta.obrigatoria) };

  if (pergunta.tipo === "texto_longo") {
    return <textarea {...common} rows={5} className="mt-4 w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 outline-none focus:border-[#1adc7f]" placeholder="Escreva aqui..." />;
  }

  if (pergunta.tipo === "texto") {
    return <input {...common} type="text" className="mt-4 w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 outline-none focus:border-[#1adc7f]" />;
  }

  if (pergunta.tipo === "numero") {
    return <input {...common} type="number" min={pergunta.minimo ?? undefined} max={pergunta.maximo ?? undefined} className="mt-4 w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 outline-none focus:border-[#1adc7f]" />;
  }

  if (pergunta.tipo === "escala") {
    const min = Number(pergunta.minimo ?? 1);
    const max = Number(pergunta.maximo ?? 5);
    const valores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const emojis = ["😣", "😕", "😐", "🙂", "😁"];
    return (
      <div className="mt-4 grid grid-cols-5 gap-2">
        {valores.map((valor, index) => (
          <label key={valor} className="cursor-pointer text-center">
            <input {...common} type="radio" value={valor} className="peer sr-only" />
            <span className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-black/10 bg-[#fafaf7] transition peer-checked:border-[#1adc7f] peer-checked:bg-[#e7fff3] peer-checked:text-[#0a7c48]">
              <span className="text-xl">{emojis[index] ?? valor}</span>
              <span className="mt-1 text-xs font-bold">{valor}</span>
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (pergunta.tipo === "sim_nao") {
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }].map((opcao) => (
          <label key={opcao.value} className="cursor-pointer">
            <input {...common} type="radio" value={opcao.value} className="peer sr-only" />
            <span className="flex h-12 items-center justify-center rounded-xl border border-black/10 bg-[#fafaf7] font-semibold transition peer-checked:border-[#1adc7f] peer-checked:bg-[#e7fff3] peer-checked:text-[#0a7c48]">{opcao.label}</span>
          </label>
        ))}
      </div>
    );
  }

  const opcoes = Array.isArray(pergunta.opcoes) ? pergunta.opcoes : [];
  return (
    <div className="mt-4 space-y-2">
      {opcoes.map((opcao: any) => {
        const valor = typeof opcao === "string" ? opcao : String(opcao.value ?? opcao.label ?? "");
        const label = typeof opcao === "string" ? opcao : String(opcao.label ?? opcao.value ?? "");
        return (
          <label key={valor} className="block cursor-pointer">
            <input {...common} type="radio" value={valor} className="peer sr-only" />
            <span className="flex min-h-12 items-center rounded-xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-sm font-medium transition peer-checked:border-[#1adc7f] peer-checked:bg-[#e7fff3] peer-checked:text-[#0a7c48]">{label}</span>
          </label>
        );
      })}
    </div>
  );
}

function PublicMessage({ title, text, success = false, score, scoreText }: { title: string; text: string; success?: boolean; score?: number | null; scoreText?: string | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f2] px-4 text-[#17201b]">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${success ? "bg-[#e7fff3] text-[#0a7c48]" : "bg-black/5"}`}>
          {success ? <CheckCircle2 size={28} /> : <ClipboardCheck size={28} />}
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">{text}</p>
        {score != null && (
          <div className="mt-6 rounded-2xl bg-[#effcf4] p-5 text-[#217443]">
            <p className="text-xs font-bold uppercase tracking-[0.12em]">Seu score</p>
            <p className="mt-1 text-4xl font-black">{score}%</p>
            {scoreText && <p className="mt-2 text-xs leading-5 text-[#217443]/75">{scoreText}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
