import { ClipboardCheck, LockKeyhole } from "lucide-react";

export const metadata = { title: "Prévia do Check-in | Nutri Thales Rosa" };

const scale = [
  { value: 1, emoji: "😣", label: "Muito ruim" },
  { value: 2, emoji: "😕", label: "Ruim" },
  { value: 3, emoji: "😐", label: "Regular" },
  { value: 4, emoji: "🙂", label: "Bom" },
  { value: 5, emoji: "😁", label: "Excelente" },
];

export default function PreviewCheckinPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f3] px-4 py-8 text-[#17201b] sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 rounded-2xl border border-[#1adc7f]/30 bg-[#e7fff3] px-4 py-3 text-sm font-semibold text-[#0a7c48]">
          Modo de prévia — nenhuma resposta será salva.
        </div>

        <header className="mb-6 rounded-[28px] bg-[#17201b] p-6 text-white shadow-sm sm:p-8">
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1adc7f] text-[#17201b]">
            <ClipboardCheck size={22} />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#1adc7f]">Nutri Thales Rosa</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Check-in Quinzenal</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
            Esse check-in leva poucos minutos e ajuda a entender como foram seus últimos 15 dias para ajustar o acompanhamento com mais precisão.
          </p>
          <p className="mt-5 text-sm font-semibold">Olá, paciente.</p>
        </header>

        <form className="space-y-4">
          <QuestionCard number={1} title="Dedicação" required>
            <p className="mb-4 text-sm text-black/60">O quanto você se dedicou ao plano nos últimos 15 dias?</p>
            <EmojiScale name="dedicacao" />
          </QuestionCard>

          <QuestionCard number={2} title="Disposição durante o dia" required>
            <p className="mb-4 text-sm text-black/60">Como está a sua disposição durante o dia?</p>
            <EmojiScale name="disposicao" />
          </QuestionCard>

          <QuestionCard number={3} title="Qualidade do sono" required>
            <p className="mb-4 text-sm text-black/60">Como está a qualidade do seu sono nas últimas noites?</p>
            <EmojiScale name="sono" />
          </QuestionCard>

          <QuestionCard number={4} title="Ingestão de líquidos" required>
            <p className="mb-4 text-sm text-black/60">Quantos litros de água você está bebendo por dia, em média?</p>
            <Choice name="agua" options={["Menos de 1 L", "1 a 1,5 L", "1,5 a 2 L", "2 a 3 L", "Mais de 3 L"]} />
          </QuestionCard>

          <QuestionCard number={5} title="Consumo de frutas" required>
            <p className="mb-4 text-sm text-black/60">Quantas porções de frutas você consumiu por dia nos últimos dias?</p>
            <Choice name="frutas" options={["Nenhuma", "1 porção", "2 porções", "3 porções", "4 ou mais"]} />
          </QuestionCard>

          <QuestionCard number={6} title="Consumo de vegetais" required>
            <p className="mb-4 text-sm text-black/60">Quantas porções de vegetais você consumiu por dia nos últimos dias?</p>
            <Choice name="vegetais" options={["Nenhuma", "1 porção", "2 porções", "3 porções", "4 ou mais"]} />
          </QuestionCard>

          <QuestionCard number={7} title="Treinos" required>
            <p className="mb-4 text-sm text-black/60">Quantas sessões de treino você realizou nos últimos 15 dias? Considere qualquer modalidade.</p>
            <input type="number" min="0" max="30" placeholder="Ex.: 8" className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 outline-none focus:border-[#1adc7f]" />
          </QuestionCard>

          <QuestionCard number={8} title="Níveis de fome" required>
            <p className="mb-4 text-sm text-black/60">Como você considera que está seu nível de fome e apetite atualmente?</p>
            <Choice name="fome" options={["Muito baixo", "Baixo", "Adequado", "Alto", "Muito alto"]} />
          </QuestionCard>

          <QuestionCard number={9} title="Aderência ao plano" required>
            <p className="mb-4 text-sm text-black/60">Como está sua aderência ao plano de refeições?</p>
            <Choice name="aderencia" options={["Muito baixa", "Baixa", "Regular", "Boa", "Excelente"]} />
          </QuestionCard>

          <QuestionCard number={10} title="Refeições fora do planejado" required>
            <p className="mb-4 text-sm text-black/60">Quantas refeições fora do planejado você fez nos últimos 15 dias?</p>
            <input type="number" min="0" max="30" placeholder="Ex.: 3" className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 outline-none focus:border-[#1adc7f]" />
          </QuestionCard>

          <QuestionCard number={11} title="Feedback aberto" required>
            <p className="mb-4 text-sm text-black/60">O que mais você gostaria de compartilhar sobre sua experiência nesses últimos 15 dias?</p>
            <textarea rows={5} placeholder="Conte aqui o que achar importante..." className="w-full rounded-2xl border border-black/10 bg-[#fafaf7] px-4 py-3 outline-none focus:border-[#1adc7f]" />
          </QuestionCard>

          <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0a7c48]">Etapa final</p>
            <h2 className="mt-2 text-lg font-bold">Pontuação do questionário</h2>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Ao concluir, o sistema calcula um score de 0 a 100% considerando os pesos das perguntas respondidas. O resultado é apenas um resumo do acompanhamento e será analisado junto com suas respostas.
            </p>
          </div>

          <button type="button" className="w-full rounded-2xl bg-[#17201b] px-5 py-4 text-base font-bold text-white">
            Enviar respostas
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-black/45">
          <LockKeyhole size={14} /> Link individual e protegido para este acompanhamento.
        </div>
      </div>
    </main>
  );
}

function QuestionCard({ number, title, required, children }: { number: number; title: string; required?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#e7fff3] text-xs font-bold text-[#0a7c48]">{number}</span>
        <div>
          <h2 className="font-semibold leading-6">{title}{required && <span className="ml-1 text-[#0a7c48]">*</span>}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmojiScale({ name }: { name: string }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {scale.map((item) => (
        <label key={item.value} className="cursor-pointer text-center">
          <input type="radio" name={name} value={item.value} className="peer sr-only" />
          <span className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-black/10 bg-[#fafaf7] px-1 py-2 transition peer-checked:border-[#1adc7f] peer-checked:bg-[#e7fff3]">
            <span className="text-2xl">{item.emoji}</span>
            <span className="mt-1 text-[10px] leading-3 text-black/55">{item.label}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Choice({ name, options }: { name: string; options: string[] }) {
  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <label key={option} className="block cursor-pointer">
          <input type="radio" name={name} value={index + 1} className="peer sr-only" />
          <span className="flex min-h-12 items-center rounded-xl border border-black/10 bg-[#fafaf7] px-4 py-3 text-sm font-medium transition peer-checked:border-[#1adc7f] peer-checked:bg-[#e7fff3] peer-checked:text-[#0a7c48]">{option}</span>
        </label>
      ))}
    </div>
  );
}
