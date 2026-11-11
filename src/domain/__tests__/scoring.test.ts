/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, periodEnd, previousPeriodKey, weekKey } from '../dates';
import { dailyChallenge, getHabit } from '../habits';
import { levelInfo } from '../progression';
import { PERFECT_DAY_BONUS, ScoreBook, streakMultiplier } from '../scoring';
import type { Checkin, Duel } from '../types';

const duel: Duel = {
  id: 'duel-1',
  code: 'ABC123',
  name: 'Teste',
  createdAt: '2026-11-02T10:00:00.000Z',
  habitIds: ['agua', 'leitura', 'refeicao'],
  players: [
    { id: 'a', name: 'Ana', avatar: '🦁', color: '#f00' },
    { id: 'b', name: 'Bia', avatar: '🐯', color: '#0f0' },
  ],
};

let n = 0;
const ck = (playerId: string, habitId: string, dateKey: string, extra: Partial<Checkin> = {}): Checkin => ({
  id: `c${n++}`,
  duelId: duel.id,
  playerId,
  habitId,
  dateKey,
  createdAt: `${dateKey}T12:00:00.000Z`,
  photoUri: 'file://x.jpg',
  reactions: {},
  ...extra,
});

describe('datas', () => {
  it('semana começa na segunda', () => {
    assert.equal(weekKey('2026-11-11'), '2026-11-09'); // quarta -> segunda
    assert.equal(weekKey('2026-11-15'), '2026-11-09'); // domingo -> segunda anterior
    assert.equal(periodEnd('week', '2026-11-09'), '2026-11-15');
  });
  it('mês e períodos anteriores', () => {
    assert.equal(periodEnd('month', '2026-02'), '2026-02-28');
    assert.equal(previousPeriodKey('month', '2026-01-10'), '2025-12');
    assert.equal(previousPeriodKey('week', '2026-11-11'), '2026-11-02');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  });
});

describe('pontuação', () => {
  it('limita check-ins ao máximo diário e ignora contestados', () => {
    const day = '2026-11-03';
    const book = new ScoreBook(duel, [
      ck('a', 'refeicao', day),
      ck('a', 'refeicao', day),
      ck('a', 'refeicao', day),
      ck('a', 'refeicao', day), // 4ª refeição não conta
      ck('a', 'agua', day, { disputed: true }),
    ]);
    const b = book.day('a', day);
    assert.equal(b.counts.refeicao, 3);
    assert.equal(b.counts.agua, undefined);
    assert.equal(b.base, 3 * getHabit('refeicao')!.points);
    assert.equal(b.perfect, false);
  });

  it('dia perfeito dá bônus', () => {
    const day = '2026-11-03';
    const book = new ScoreBook(duel, [
      ck('a', 'agua', day),
      ck('a', 'leitura', day),
      ck('a', 'refeicao', day),
      ck('a', 'refeicao', day),
      ck('a', 'refeicao', day),
    ]);
    const b = book.day('a', day);
    assert.equal(b.perfect, true);
    assert.equal(b.total, 10 + 15 + 24 + PERFECT_DAY_BONUS);
  });

  it('desafio do dia vale 2x e hábito fora das metas não pontua', () => {
    const day = '2026-11-04';
    const challenge = dailyChallenge(duel.id, day, duel.habitIds);
    assert.ok(!duel.habitIds.includes(challenge.id));
    const other = ['exercicio', 'passos', 'sono'].find((id) => id !== challenge.id)!;
    const book = new ScoreBook(duel, [ck('a', challenge.id, day), ck('a', other, day)]);
    assert.equal(book.day('a', day).base, challenge.points * 2);
  });

  it('combo por sequência', () => {
    assert.equal(streakMultiplier(1), 1);
    assert.equal(streakMultiplier(3), 1.1);
    assert.equal(streakMultiplier(7), 1.25);
    const days = ['2026-11-02', '2026-11-03', '2026-11-04'];
    const book = new ScoreBook(duel, days.map((d) => ck('a', 'leitura', d)));
    assert.equal(book.day('a', days[0]).total, 15);
    assert.equal(book.day('a', days[2]).total, Math.round(15 * 1.1));
    assert.equal(book.currentStreak('a', '2026-11-05'), 3); // ainda vale até ontem
    assert.equal(book.currentStreak('a', '2026-11-06'), 0);
  });

  it('ranking, vencedor, empate e histórico', () => {
    const book = new ScoreBook(duel, [
      ck('a', 'leitura', '2026-11-02'),
      ck('b', 'agua', '2026-11-02'),
      ck('a', 'agua', '2026-11-03'),
      ck('b', 'agua', '2026-11-03'),
    ]);
    const d1 = book.result('day', '2026-11-02', '2026-11-11');
    assert.equal(d1.winner?.id, 'a');
    const d2 = book.result('day', '2026-11-03', '2026-11-11');
    assert.equal(d2.tie, true);
    assert.equal(d2.winner, null);
    const week = book.result('week', '2026-11-02', '2026-11-11');
    assert.equal(week.winner?.id, 'a');
    assert.equal(book.winCount('a', 'day', '2026-11-11'), 1);
    assert.equal(book.winCount('a', 'week', '2026-11-11'), 1);
    assert.equal(book.closedResults('week', '2026-11-11').length, 1);
  });
});

describe('níveis', () => {
  it('sobe de nível com XP', () => {
    assert.equal(levelInfo(0).level, 1);
    assert.ok(levelInfo(1000).level > levelInfo(100).level);
    const l = levelInfo(500);
    assert.ok(l.progress >= 0 && l.progress < 1);
  });
});
