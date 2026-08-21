import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Descreva o que foi consumido." }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Estimativa por IA temporariamente indisponível." }, { status: 503 });

  const prompt = [
    "Estime calorias e macronutrientes totais da refeição descrita por um paciente.",
    "Considere as quantidades informadas; quando não houver quantidade, use uma porção individual comum.",
    "Responda somente JSON válido, sem markdown, exatamente no formato:",
    '{"kcal":numero,"p":numero,"c":numero,"f":numero}',
    "kcal = calorias; p = proteína em gramas; c = carboidrato em gramas; f = gordura em gramas.",
    `Descrição: ${text}`,
  ].join(" ");

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!response.ok) return NextResponse.json({ error: "Não foi possível estimar agora." }, { status: 502 });
    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(String(raw).replace(/```json|```/g, "").trim());
    const result = { kcal: Number(parsed.kcal), p: Number(parsed.p), c: Number(parsed.c), f: Number(parsed.f) };
    if (Object.values(result).some((v) => !Number.isFinite(v) || v < 0)) throw new Error("invalid");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "A estimativa não pôde ser calculada." }, { status: 500 });
  }
}
