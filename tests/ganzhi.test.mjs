import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../js/core/ganzhi.js');

test('十神：以丙火日主为准', () => {
  assert.equal(G.shiShen('丙', '丙'), '比肩');
  assert.equal(G.shiShen('丙', '丁'), '劫财');
  assert.equal(G.shiShen('丙', '戊'), '食神');
  assert.equal(G.shiShen('丙', '己'), '伤官');
  assert.equal(G.shiShen('丙', '庚'), '偏财');
  assert.equal(G.shiShen('丙', '辛'), '正财');
  assert.equal(G.shiShen('丙', '壬'), '七杀');
  assert.equal(G.shiShen('丙', '癸'), '正官');
  assert.equal(G.shiShen('丙', '甲'), '偏印');
  assert.equal(G.shiShen('丙', '乙'), '正印');
});

test('十神：阴干日主（乙木）', () => {
  assert.equal(G.shiShen('乙', '庚'), '正官');
  assert.equal(G.shiShen('乙', '辛'), '七杀');
  assert.equal(G.shiShen('乙', '壬'), '正印');
});

test('五行加权：庚辰 己卯 丙寅 壬辰（chart-calculation.md §2.3 实例）', () => {
  const p = [
    { gan: '庚', zhi: '辰' }, { gan: '己', zhi: '卯' }, { gan: '丙', zhi: '寅' }, { gan: '壬', zhi: '辰' },
  ];
  const { raw, pct } = G.wuxingWeights(p);
  assert.ok(Math.abs(raw.木 - 1.8) < 1e-9);
  assert.ok(Math.abs(raw.火 - 1.3) < 1e-9);
  assert.ok(Math.abs(raw.土 - 2.3) < 1e-9);
  assert.ok(Math.abs(raw.金 - 1.0) < 1e-9);
  assert.ok(Math.abs(raw.水 - 1.2) < 1e-9);
  assert.equal(pct.木, 24);
  assert.equal(pct.土, 30);
});

test('五行加权：时柱未知时跳过 null', () => {
  const { pct } = G.wuxingWeights([{ gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }, null]);
  assert.equal(pct.木 + pct.水, 100);
});

test('地支关系', () => {
  assert.deepEqual(G.zhiRelation('寅', '申'), ['冲', '刑']);
  assert.deepEqual(G.zhiRelation('子', '丑'), ['六合']);
  assert.deepEqual(G.zhiRelation('辰', '辰'), ['自刑']);
  assert.deepEqual(G.zhiRelation('申', '子'), ['半合水']);
  assert.deepEqual(G.zhiRelation('寅', '巳'), ['害', '刑']);
  assert.deepEqual(G.zhiRelation('子', '寅'), []);
});

test('十神分组对应五行', () => {
  const g = G.groupWx('丙');
  assert.deepEqual(g, { 比劫: '火', 食伤: '土', 财星: '金', 官杀: '水', 印星: '木' });
});
