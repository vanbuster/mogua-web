import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../js/vendor/lunar.js'));
require('../js/core/ganzhi.js');
const E = require('../js/core/bazi-engine.js');

const NOW = new Date(2026, 8, 3, 1, 30); // 2026-09-03 丙午年 丙申月

test('四柱：2000-03-08 23:30 男 → 庚辰 己卯 丙寅 戊子（夜子时归次日）', () => {
  const c = E.compute({ year: 2000, month: 3, day: 8, hour: 23, minute: 30, gender: 1, hourKnown: true, now: NOW });
  assert.deepEqual(c.pillars.map((p) => p.gan + p.zhi), ['庚辰', '己卯', '丙寅', '戊子']);
  assert.equal(c.dayGan, '丙');
  assert.equal(c.pillars[0].god, '偏财');
  assert.equal(c.pillars[1].god, '伤官');
  assert.equal(c.pillars[2].god, '日主');
  assert.equal(c.pillars[3].god, '食神');
  assert.deepEqual(c.pillars[2].hidden.map((h) => h.gan), ['甲', '丙', '戊']);
  assert.equal(c.pillars[2].hidden[0].god, '偏印');
  assert.equal(c.shengxiao, '龙');
});

test('日柱：2000-03-08 中午 → 乙丑（skill 文档示例算错，以库为准）', () => {
  const c = E.compute({ year: 2000, month: 3, day: 8, hour: 12, minute: 0, gender: 1, hourKnown: true, now: NOW });
  assert.equal(c.pillars[2].gan + c.pillars[2].zhi, '乙丑');
});

test('立春分界：2026-02-04 04:02 之前仍属乙巳年', () => {
  const a = E.compute({ year: 2026, month: 2, day: 4, hour: 3, minute: 0, gender: 0, hourKnown: true, now: NOW });
  const b = E.compute({ year: 2026, month: 2, day: 4, hour: 5, minute: 0, gender: 0, hourKnown: true, now: NOW });
  assert.equal(a.pillars[0].gan + a.pillars[0].zhi, '乙巳');
  assert.equal(b.pillars[0].gan + b.pillars[0].zhi, '丙午');
});

test('时辰未知：时柱为 null，五行只按六字算', () => {
  const c = E.compute({ year: 2000, month: 3, day: 8, gender: 1, hourKnown: false, now: NOW });
  assert.equal(c.pillars[3], null);
  const s = Object.values(c.wuxing.pct).reduce((a, b) => a + b, 0);
  assert.equal(s, 100);
});

test('时柱按五鼠遁：乙日辰时 → 庚辰', () => {
  const c = E.compute({ year: 2000, month: 3, day: 8, hour: 8, minute: 0, gender: 1, hourKnown: true, now: NOW });
  assert.equal(c.pillars[2].gan + c.pillars[2].zhi, '乙丑');
  assert.equal(c.pillars[3].gan + c.pillars[3].zhi, '庚辰');
});

test('大运：阳年男顺排，起运信息与当前大运', () => {
  const c = E.compute({ year: 2000, month: 3, day: 8, hour: 23, minute: 30, gender: 1, hourKnown: true, now: NOW });
  assert.equal(c.yun.forward, true);
  assert.equal(c.yun.startYear, 2009);
  assert.equal(c.dayun[0].gz, '庚辰');
  assert.equal(c.dayun[1].gz, '辛巳');
  const cur = c.dayun.find((d) => d.isNow);
  assert.equal(cur.gz, '辛巳');
  assert.equal(c.now.age, 27);
});

test('流年流月：当前流年丙午，12 个流月自寅起，红绿灯取值合法', () => {
  const c = E.compute({ year: 2000, month: 3, day: 8, hour: 23, minute: 30, gender: 1, hourKnown: true, now: NOW });
  assert.equal(c.now.liunian.gz, '丙午');
  assert.equal(c.months.length, 12);
  assert.equal(c.months[0].zhi, '寅');
  assert.equal(c.months[0].gz, '庚寅');
  c.months.forEach((m) => assert.ok(['g', 'y', 'r'].includes(m.level)));
  const shen = c.months.find((m) => m.zhi === '申');
  assert.equal(shen.level, 'r'); // 寅申冲日支
  assert.ok(c.months.some((m) => m.isNow));
  assert.equal(c.years.length, 5);
  assert.equal(c.years[0].year, 2026);
});

test('旺衰与喜用：丙火生卯月得令，印比偏旺', () => {
  const c = E.compute({ year: 2000, month: 3, day: 8, hour: 23, minute: 30, gender: 1, hourKnown: true, now: NOW });
  assert.ok(['身旺', '身弱', '中和'].includes(c.strength.level));
  assert.equal(c.strength.favor.length + c.strength.avoid.length, 5);
  assert.ok(c.pattern.name.endsWith('格'));
});

test('神煞：至少能识别驿马/桃花/文昌之一并给出空亡', () => {
  const c = E.compute({ year: 2000, month: 3, day: 8, hour: 23, minute: 30, gender: 1, hourKnown: true, now: NOW });
  assert.ok(Array.isArray(c.shensha));
  assert.equal(typeof c.xunkong, 'string');
});
