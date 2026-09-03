import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../js/vendor/lunar.js'));
require('../js/core/ganzhi.js');
require('../js/core/yijing-data.js');
const E = require('../js/core/bazi-engine.js');
const R = require('../js/core/bazi-reading.js');
const M = require('../js/core/meihua.js');
const GR = require('../js/core/gua-reading.js');

test('八字解读：六宫格 + 特质 + 建议全部为非空字符串', () => {
  const c = E.compute({ year: 1998, month: 11, day: 20, hour: 6, minute: 0, gender: 0, hourKnown: true, now: new Date(2026, 8, 3) });
  const r = R.build(c);
  ['pattern', 'personality', 'career', 'wealth', 'love', 'health'].forEach((k) => assert.ok(r[k].length > 20, k));
  assert.ok(r.traits.length >= 2);
  assert.ok(r.advice.dir && r.advice.color);
});

test('八字解读：时辰未知也能出全文', () => {
  const c = E.compute({ year: 1985, month: 7, day: 1, gender: 1, hourKnown: false, now: new Date(2026, 8, 3) });
  const r = R.build(c);
  assert.ok(r.love.length > 10);
});

test('问事解答：各类别 × 动静卦均可生成', () => {
  const a = M.analyze([1, 0, 1, 1, 1, 0], [5]);
  GR.TOPICS.forEach((t) => {
    const r = GR.build(a, t, '测试');
    assert.ok(r.main && r.tiyong && r.ci.includes('《周易·革》'), t);
    assert.ok(['凶', '偏凶', '平', '吉', '大吉'].includes(r.verdict));
  });
  const s = GR.build(M.analyze([1, 1, 1, 1, 1, 1], []), '事业');
  assert.ok(s.main.startsWith('静卦'));
  assert.ok(s.ci.includes('《周易·乾》'));
});

test('卦名简称：无妄/大有/坤', () => {
  assert.equal(M.hexagramFromLines([1, 0, 0, 1, 1, 1]).short, '无妄');
  assert.equal(M.hexagramFromLines([1, 1, 1, 1, 0, 1]).short, '大有');
  assert.equal(M.hexagramFromLines([0, 0, 0, 0, 0, 0]).short, '坤');
});
