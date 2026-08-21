"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Target, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function WeeklyGoalEditor({ patientId }: { patientId: string }) {
  const supabase = useMemo(() => createClient() as any, []);
  const [goal, setGoal] = useState(3);
  const [draft, setDraft] = useState(3);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase
        .from("pacientes")
        .select("treino_frequencia_semanal")
        .eq("id", patientId)
        .maybeSingle();
      if (!active) return;
      const value = Math.min(7, Math.max(1, Number(data?.treino_frequencia_semanal || 3)));
      setGoal(value);
      setDraft(value);
      setLoaded(true);
    }
    void load();
    return () => { active = false; };
  }, [patientId, supabase]);

  async function save() {
    if (draft === goal) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("atualizar_meta_semanal_treino", { p_meta: draft });
    setSaving(false);
    if (error) {
      window.alert("Não foi possível atualizar sua meta semanal agora.");
      return;
    }
    setGoal(draft);
    setEditing(false);
    window.location.reload();
  }

  if (!loaded) return null;

  return (
    <div className="fixed right-4 top-20 z-[60] sm:right-6 sm:top-6">
      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-[#15251D]/95 px-4 text-sm font-black text-white shadow-2xl backdrop-blur"
          aria-label="Editar meta semanal de treinos"
        >
          <Target className="size-4 text-[#19DD7F]" />
          Meta {goal}x/sem
          <Pencil className="size-3.5 opacity-60" />
        </button>
      ) : (
        <div className="w-[min(330px,calc(100vw-32px))] rounded-2xl border border-[#294337] bg-[#15251D]/98 p-4 text-white shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#19DD7F]">Sua meta semanal</p>
              <p className="mt-1 text-sm text-white/65">Escolha quantas sessões você pretende completar por semana.</p>
            </div>
            <button type="button" onClick={() => { setDraft(goal); setEditing(false); }} className="grid size-9 place-items-center rounded-full border border-white/10" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {[1,2,3,4,5,6,7].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setDraft(value)}
                className={`grid aspect-square place-items-center rounded-xl border text-sm font-black ${draft === value ? "border-[#19DD7F] bg-[#19DD7F] text-[#04120B]" : "border-white/15 text-white"}`}
              >
                {value}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-white/55">Essa meta atualiza sua barra semanal e também o cálculo de adesão acompanhado pelo seu treinador.</p>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#19DD7F] px-4 text-sm font-black text-[#04120B] disabled:opacity-60"
          >
            <Check className="size-4" /> {saving ? "Salvando..." : `Salvar meta de ${draft}x/semana`}
          </button>
        </div>
      )}
    </div>
  );
}
