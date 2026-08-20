"use client";

import { useMemo } from "react";

type Execution = any;
type Workout = any;

type Props = {
  history: Execution[];
  workouts: Workout[];
  dark: boolean;
};

const DAY_MS = 86_400_000;

function startOfDay(value: Date | string | number) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(value: Date | string | number) {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fmtTime(value: number) {
  const sec = Math.max(0, Math.floor(value || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function monthTitle(date: Date) {
  const raw = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getStartOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function getLevelLabel(level: number) {
  if (level <= 1) return "Iniciante";
  if (level <= 3) return "Consistente";
  if (level <= 5) return "Disciplinado";
  if (level <= 8) return "Em evolução";
  return "Performance";
}

function sumVolume(list: Execution[]) {
  return list.reduce((sum, item) => sum + Number(item?.dados?.volume || 0), 0);
}

export default function WorkoutEvolution({ history, workouts, dark }: Props) {
  const data = useMemo(() => {
    const completed = history
      .filter((item) => item?.concluido)
      .slice()
      .sort((a, b) => new Date(b.iniciado_em).getTime() - new Date(a.iniciado_em).getTime());

    const now = new Date();
    const today = startOfDay(now);
    const weekStart = getStartOfWeek(now);
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const week = completed.filter((item) => {
      const date = new Date(item.iniciado_em);
      return date >= weekStart && date < nextWeek;
    });
    const month = completed.filter((item) => {
      const date = new Date(item.iniciado_em);
      return date >= monthStart && date < nextMonth;
    });

    const totalTime = completed.reduce((sum, item) => sum + Number(item.duracao_seg || 0), 0);
    const totalVolume = sumVolume(completed);
    const exerciseCounts = new Map<string, number>();
    let maxLoad = 0;

    for (const item of completed) {
      const sessionExercises = Array.isArray(item?.dados?.exercises) ? item.dados.exercises : [];
      for (const exercise of sessionExercises) {
        const name = String(exercise?.name || "").trim();
        if (name) exerciseCounts.set(name, (exerciseCounts.get(name) || 0) + Math.max(1, Number(exercise?.doneSets || 0)));
        maxLoad = Math.max(maxLoad, Number(exercise?.load || 0));
      }
    }

    const mostExercise = [...exerciseCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const trainingDays = new Set(completed.map((item) => dateKey(item.iniciado_em)));
    const orderedDays = [...trainingDays].map((key) => startOfDay(`${key}T12:00:00`)).sort((a, b) => a.getTime() - b.getTime());

    let bestStreak = 0;
    let running = 0;
    let previous: Date | null = null;
    for (const day of orderedDays) {
      if (previous && Math.round((day.getTime() - previous.getTime()) / DAY_MS) === 1) running += 1;
      else running = 1;
      bestStreak = Math.max(bestStreak, running);
      previous = day;
    }

    let currentStreak = 0;
    const cursor = new Date(today);
    if (!trainingDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (trainingDays.has(dateKey(cursor))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const xp = completed.length * 100;
    const xpPerLevel = 200;
    const level = Math.floor(xp / xpPerLevel) + 1;
    const levelXp = xp % xpPerLevel;
    const levelProgress = Math.min(100, Math.round((levelXp / xpPerLevel) * 100));

    const calendar = (() => {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const mondayIndex = (first.getDay() + 6) % 7;
      return {
        blanks: Array.from({ length: mondayIndex }, (_, i) => `blank-${i}`),
        days: Array.from({ length: days }, (_, i) => i + 1),
      };
    })();

    const heatmapStart = getStartOfWeek(new Date(today.getTime() - 17 * 7 * DAY_MS));
    const heatmap = Array.from({ length: 18 * 7 }, (_, index) => {
      const date = new Date(heatmapStart);
      date.setDate(date.getDate() + index);
      return { key: dateKey(date), date, trained: trainingDays.has(dateKey(date)), future: date > today };
    });

    const achievements = [
      { code: "P", title: "Primeiro Passo", description: "Concluiu o primeiro treino", unlocked: completed.length >= 1 },
      { code: "C", title: "Consistência", description: "Sequência de 3 dias", unlocked: bestStreak >= 3 },
      { code: "D", title: "Disciplina", description: "Sequência de 7 dias", unlocked: bestStreak >= 7 },
      { code: "C", title: "Constância", description: "Sequência de 14 dias", unlocked: bestStreak >= 14 },
      { code: "U", title: "Uma Dezena", description: "10 treinos concluídos", unlocked: completed.length >= 10 },
      { code: "V", title: "Vinte Treinos", description: "20 treinos concluídos", unlocked: completed.length >= 20 },
      { code: "V", title: "Volume 10K", description: "10.000 kg movimentados", unlocked: totalVolume >= 10_000 },
      { code: "V", title: "Volume 25K", description: "25.000 kg movimentados", unlocked: totalVolume >= 25_000 },
      { code: "M", title: "Maratonista", description: "10 horas treinadas", unlocked: totalTime >= 36_000 },
    ];

    return {
      completed,
      week,
      month,
      totalTime,
      totalVolume,
      weekVolume: sumVolume(week),
      monthVolume: sumVolume(month),
      mostExercise,
      maxLoad,
      currentStreak,
      bestStreak,
      xp,
      xpPerLevel,
      level,
      levelXp,
      levelProgress,
      calendar,
      heatmap,
      achievements,
      unlockedCount: achievements.filter((item) => item.unlocked).length,
      trainingDays,
      now,
    };
  }, [history]);

  const card = dark ? "border-[#294337] bg-[#15251D]" : "border-black/10 bg-white";
  const soft = dark ? "border-[#294337] bg-[#1B2F25]" : "border-black/10 bg-[#F4F6F4]";

  return (
    <>
      <section className="mb-7 pt-2">
        <p className="text-sm font-bold opacity-55">Evolução</p>
        <h1 className="mt-1 text-4xl font-black leading-none tracking-tight sm:text-5xl">Seu histórico de treinos</h1>
        <p className="mt-3 text-base opacity-60">{data.completed.length} treinos registrados</p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={`rounded-[24px] border p-5 ${card}`}>
          <b className="block text-2xl font-black tabular-nums">{fmtTime(data.totalTime)}</b>
          <span className="mt-2 block text-sm font-bold opacity-60">Tempo total treinado</span>
        </div>
        <div className={`rounded-[24px] border p-5 ${card}`}>
          <b className="block break-words text-xl font-black">{data.mostExercise}</b>
          <span className="mt-2 block text-sm font-bold opacity-60">Exercício mais realizado</span>
        </div>
        <div className={`rounded-[24px] border p-5 ${card}`}>
          <b className="block text-2xl font-black">{data.maxLoad > 0 ? `${data.maxLoad} kg` : "0 kg"}</b>
          <span className="mt-2 block text-sm font-bold opacity-60">Maior carga registrada</span>
        </div>
      </div>

      <section className={`mt-4 rounded-[26px] border p-6 ${card}`}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-black opacity-60">Nível {data.level} · {getLevelLabel(data.level)}</p>
            <p className="mt-1 text-4xl font-black">{data.xp} <span className="text-2xl opacity-45">XP</span></p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-[#19DD7F]">{data.currentStreak}</p>
            <p className="text-sm font-black opacity-60">dias seguidos</p>
          </div>
        </div>
        <div className={`mt-5 h-3 overflow-hidden rounded-full ${dark ? "bg-[#243C30]" : "bg-black/10"}`}>
          <div className="h-full rounded-full bg-[#19DD7F] transition-all" style={{ width: `${data.levelProgress}%` }} />
        </div>
        <p className="mt-4 text-sm opacity-60">{data.levelXp} / {data.xpPerLevel} XP para o nível {data.level + 1} · Maior sequência: {data.bestStreak} dias</p>
      </section>

      <section className="mt-8">
        <h2 className="text-3xl font-black">Conquistas</h2>
        <p className="mt-1 opacity-60">{data.unlockedCount} de {data.achievements.length} desbloqueadas</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {data.achievements.map((achievement) => (
            <article key={achievement.title} className={`rounded-[24px] border p-5 text-center ${achievement.unlocked ? card : `${card} opacity-45`}`}>
              <div className={`mx-auto grid size-14 place-items-center rounded-full border-2 text-lg font-black ${achievement.unlocked ? "border-[#19DD7F] bg-[#19DD7F] text-[#04120B]" : "border-current/20"}`}>{achievement.code}</div>
              <h3 className="mt-4 text-base font-black">{achievement.title}</h3>
              <p className="mt-1 text-xs leading-5 opacity-60">{achievement.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] bg-[#163F2A] px-6 py-7 text-white">
        <p className="text-xl font-black italic">“Disciplina supera motivação.”</p>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <section className={`rounded-[26px] border p-6 ${card}`}>
          <p className="text-base font-black opacity-60">Resumo da semana</p>
          <p className="mt-3 text-4xl font-black">{data.week.length} <span className="text-2xl opacity-45">treinos</span></p>
          <p className="mt-3 text-base font-bold opacity-60">{fmtTime(data.week.reduce((sum, item) => sum + Number(item.duracao_seg || 0), 0))} · {Math.round(data.weekVolume).toLocaleString("pt-BR")} kg movimentados</p>
        </section>
        <section className={`rounded-[26px] border p-6 ${card}`}>
          <p className="text-base font-black opacity-60">Resumo do mês</p>
          <p className="mt-3 text-4xl font-black">{data.month.length} <span className="text-2xl opacity-45">treinos</span></p>
          <p className="mt-3 text-base font-bold opacity-60">{fmtTime(data.month.reduce((sum, item) => sum + Number(item.duracao_seg || 0), 0))} · {Math.round(data.monthVolume).toLocaleString("pt-BR")} kg movimentados</p>
        </section>
      </div>

      <section className={`mt-6 rounded-[28px] border p-6 ${card}`}>
        <h2 className="text-2xl font-black">{monthTitle(data.now)}</h2>
        <p className="mt-1 text-sm opacity-60">Dias com treino concluído</p>
        <div className="mt-6 grid grid-cols-7 text-center text-xs font-black opacity-50">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-y-3 text-center">
          {data.calendar.blanks.map((key) => <span key={key} className="aspect-square" />)}
          {data.calendar.days.map((day) => {
            const date = new Date(data.now.getFullYear(), data.now.getMonth(), day);
            const trained = data.trainingDays.has(dateKey(date));
            const today = dateKey(date) === dateKey(new Date());
            return <div key={day} className="grid aspect-square place-items-center"><span className={`grid size-10 place-items-center rounded-xl text-sm font-black ${trained ? "bg-[#19DD7F] text-[#04120B]" : today ? "border-2 border-[#19DD7F]" : ""}`}>{day}</span></div>;
          })}
        </div>
      </section>

      <section className={`mt-6 rounded-[28px] border p-6 ${card}`}>
        <h2 className="text-2xl font-black">Frequência de treinos</h2>
        <p className="mt-1 text-sm opacity-60">Últimas 18 semanas</p>
        <div className="mt-5 overflow-x-auto pb-1">
          <div className="grid min-w-[560px] grid-flow-col grid-rows-7 gap-1.5">
            {data.heatmap.map((item) => (
              <span key={item.key} title={`${item.date.toLocaleDateString("pt-BR")}${item.trained ? " · treino concluído" : ""}`} className={`size-5 rounded-[5px] ${item.trained ? "bg-[#19DD7F]" : item.future ? "opacity-20" : dark ? "bg-[#30483C]" : "bg-[#E1E7E3]"}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-3xl font-black">Últimos treinos</h2>
        <p className="mt-1 text-sm opacity-60">Data, duração, exercícios, séries e volume de cada sessão</p>
        <div className="mt-4 grid gap-3">
          {data.completed.length === 0 ? (
            <div className={`rounded-[24px] border p-6 text-sm opacity-60 ${card}`}>Os treinos concluídos aparecerão aqui automaticamente.</div>
          ) : data.completed.slice(0, 12).map((item) => {
            const sessionExercises = Array.isArray(item?.dados?.exercises) ? item.dados.exercises : [];
            const totalSets = sessionExercises.reduce((sum: number, exercise: any) => sum + Number(exercise?.doneSets || 0), 0);
            const workoutName = item?.dados?.workoutName || workouts.find((workout) => workout.id === item.treino_id)?.nome || "Treino";
            return (
              <article key={item.id} className={`rounded-[24px] border p-5 ${card}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black">{workoutName}</h3>
                    <p className="mt-1 text-xs opacity-55">{fmtDate(item.iniciado_em)}</p>
                  </div>
                  <div className="text-right text-sm font-black text-[#19DD7F]">
                    <p>{fmtTime(Number(item.duracao_seg || 0))}</p>
                    <p>{Math.round(Number(item?.dados?.volume || 0)).toLocaleString("pt-BR")} kg</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className={`rounded-xl border p-3 ${soft}`}><b className="block text-base">{sessionExercises.length}</b><span className="opacity-55">exercícios</span></div>
                  <div className={`rounded-xl border p-3 ${soft}`}><b className="block text-base">{totalSets}</b><span className="opacity-55">séries concluídas</span></div>
                </div>
                {sessionExercises.length > 0 ? <p className="mt-3 text-xs leading-5 opacity-60">{sessionExercises.map((exercise: any) => exercise?.name).filter(Boolean).join(" · ")}</p> : null}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}


