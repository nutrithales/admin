import assert from 'node:assert/strict';
import { brasilDate, isReleased, isCalendarDate, durationSeconds, durationText, pace, recordInput } from '../src/lib/running/core.ts';

assert.equal(brasilDate(new Date('2026-12-01T02:59:59Z')), '2026-11-30');
assert.equal(brasilDate(new Date('2026-12-01T03:00:00Z')), '2026-12-01');
assert.equal(brasilDate(new Date('2027-01-01T02:59:59Z')), '2026-12-31');
assert.equal(brasilDate(new Date('2027-01-01T03:00:00Z')), '2027-01-01');
assert.equal(isReleased('2026-12-01', '2026-11-30'), false);
assert.equal(isReleased('2026-12-01', '2026-12-01'), true);
assert.equal(isCalendarDate('2027-02-29'), false);
assert.equal(isCalendarDate('2028-02-29'), true);
assert.equal(durationSeconds('20:54'), 1254);
assert.equal(durationSeconds('1:10:30'), 4230);
assert.equal(durationSeconds(''), null);
assert.throws(() => durationSeconds('1:70'));
assert.throws(() => durationSeconds('0:00'));
assert.throws(() => durationSeconds('25:00:00'));
assert.equal(durationText(4230), '70:30');
assert.equal(pace(1254, 3), '6:58/km');
assert.equal(pace(null, 3), '—');
assert.equal(pace(1200, null), '—');
const input = { treinoId: '00000000-0000-4000-8000-000000000001', concluido: true, data_realizada: '2026-11-09', tempo: '', distancia_km: '5,5', rpe: '0', dor: '', sono_horas: '6,5', fc_media: '', terreno: '', feedback: ' Bem ' };
const valid = recordInput.parse(input);
assert.equal(valid.distancia_km, 5.5);assert.equal(valid.rpe, 0);assert.equal(valid.dor, null);assert.equal(valid.sono_horas, 6.5);assert.equal(valid.feedback, 'Bem');
for (const patch of [{ rpe: 11 }, { dor: -1 }, { distancia_km: 'abc' }, { distancia_km: 0 }, { sono_horas: 25 }, { data_realizada: '2027-02-29' }, { paciente_id: 'other' }]) {
  assert.equal(recordInput.safeParse({ ...input, ...patch }).success, false);
}
console.log('PASS: virada de mês em Brasília, datas, tempo, ritmo, dados opcionais e validação de registros.');
