import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../js/core/ganzhi.js');
require('../js/core/yijing-data.js');
const M = require('../js/core/meihua.js');

test('六十四卦数据完整：64 卦、编号 1-64 各出现一次', () => {
  const { HEXAGRAMS } = require('../js/core/yijing-data.js');
  const list = Object.values(HEXAGRAMS);
  assert.equal(list.length, 64);
  const nums = new Set(list.map((h) => h.n));
  assert.equal(nums.size, 64);
  assert.ok(list.every((h) => h.ci && h.duan && h.level >= 1 && h.level <= 5));
});

test('先天卦数取余：1乾 8坤 0→坤 9→乾', () => {
  assert.equal(M.trigramByNumber(1).name, '乾');
  assert.equal(M.trigramByNumber(8).name, '坤');
  assert.equal(M.trigramByNumber(0).name, '坤');
  assert.equal(M.trigramByNumber(9).name, '乾');
  assert.equal(M.trigramByNumber(16).name, '坤');
});

test('由六爻求卦：乾为天 / 地天泰 / 水火既济', () => {
  assert.equal(M.hexagramFromLines([1, 1, 1, 1, 1, 1]).name, '乾为天');
  assert.equal(M.hexagramFromLines([1, 1, 1, 0, 0, 0]).name, '地天泰');
  assert.equal(M.hexagramFromLines([1, 0, 1, 0, 1, 0]).name, '水火既济');
});

test('时间起卦：辰年(5) 二月 初三 子时 → 上兑下离 动五爻 = 泽火革', () => {
  const c = M.castByTime({ yearZhiIndex: 4, lunarMonth: 2, lunarDay: 3, hourZhiIndex: 0 });
  assert.equal(c.upper.name, '兑');
  assert.equal(c.lower.name, '离');
  assert.equal(c.moving, 5);
  assert.equal(c.hex.name, '泽火革');
});

test('数字起卦：两数 [123,456] → 离上坤下 动三爻 = 火地晋', () => {
  const c = M.castByNumbers([123, 456]);
  assert.equal(c.hex.name, '火地晋');
  assert.equal(c.moving, 3);
});

test('数字起卦：单数 1234 拆为 12/34 → 震上兑下 动四爻 = 雷泽归妹', () => {
  const c = M.castByNumbers([1234]);
  assert.equal(c.hex.name, '雷泽归妹');
  assert.equal(c.moving, 4);
});

test('数字起卦：三数第三数定动爻', () => {
  const c = M.castByNumbers([1, 1, 7]);
  assert.equal(c.hex.name, '乾为天');
  assert.equal(c.moving, 1);
});

test('铜钱：背面数 → 爻', () => {
  assert.deepEqual(M.coinsToLine(0), { yang: 0, moving: true, label: '老阴' });
  assert.deepEqual(M.coinsToLine(1), { yang: 1, moving: false, label: '少阳' });
  assert.deepEqual(M.coinsToLine(2), { yang: 0, moving: false, label: '少阴' });
  assert.deepEqual(M.coinsToLine(3), { yang: 1, moving: true, label: '老阳' });
});

test('解卦：泽火革动五爻 → 变卦雷火丰，互卦天风姤，体离用兑，用克体', () => {
  const c = M.castByNumbers([2, 3, 5]);
  assert.equal(c.hex.name, '泽火革');
  const a = M.analyze(c.lines, [5]);
  assert.equal(a.ben.name, '泽火革');
  assert.equal(a.bian.name, '雷火丰');
  assert.equal(a.hu.name, '天风姤');
  assert.equal(a.ti.name, '离');
  assert.equal(a.yong.name, '兑');
  assert.equal(a.relation, '体克用');
});

test('解卦：动爻在下卦时下卦为用', () => {
  const a = M.analyze([1, 1, 1, 0, 0, 0], [2]); // 地天泰 动二爻
  assert.equal(a.yong.name, '乾');
  assert.equal(a.ti.name, '坤');
  assert.equal(a.relation, '体生用'); // 坤土生乾金
  assert.equal(a.bian.name, '地火明夷');
});

test('解卦：静卦（无动爻）以本卦断，变卦等于本卦', () => {
  const a = M.analyze([1, 1, 1, 1, 1, 1], []);
  assert.equal(a.bian.name, '乾为天');
  assert.equal(a.relation, '比和');
});
