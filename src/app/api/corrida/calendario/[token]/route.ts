import { readPrivateCalendar } from "@/services/running-calendar";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privacyHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await readPrivateCalendar(token);
    if (!body) return new Response("Calendário indisponível.", { status: 404, headers: privacyHeaders });
    return new Response(body, { headers: { ...privacyHeaders, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="corrida.ics"' } });
  } catch {
    // Never log the request URL, bearer token or prescription payload.
    return new Response("Calendário temporariamente indisponível.", { status: 503, headers: { ...privacyHeaders, "Retry-After": "60" } });
  }
}
