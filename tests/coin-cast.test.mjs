import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../js/ui/coin-cast.js');

const TAU = Math.PI * 2;
/** 渲染约定：cos(spin) >= 0 显示「字」面(0)，否则显示「背」面(1) */
const shownFace = (spin) => (Math.cos(spin) >= 0 ? 0 : 1);

test('落定角：字面收敛到 cos>0，背面收敛到 cos<0', () => {
  for (const face of [0, 1]) {
    for (const cur of [0, 0.7, 3.0, 12.5, 40.1]) {
      const t = C.landingSpin(cur, face, 0);
      assert.equal(shownFace(t), face, `face=${face} cur=${cur} → ${t}`);
    }
  }
});

test('落定角总是大于当前角，且至少转够指定圈数', () => {
  const cur = 5.5;
  const t0 = C.landingSpin(cur, 1, 0);
  assert.ok(t0 > cur);
  const t3 = C.landingSpin(cur, 1, 3);
  assert.ok(t3 >= cur + 3 * TAU, `${t3} vs ${cur + 3 * TAU}`);
  assert.equal(shownFace(t3), 1);
});

test('落定角是 2π 的整数倍偏移，不会漂移', () => {
  const t = C.landingSpin(9.9, 0, 2);
  assert.ok(Math.abs(t % TAU) < 1e-9 || Math.abs((t % TAU) - TAU) < 1e-9);
});

test('背面计数：三枚铜钱 face 数组 → 背面数', () => {
  assert.equal(C.backsOf([0, 0, 0]), 0);
  assert.equal(C.backsOf([1, 0, 1]), 2);
  assert.equal(C.backsOf([1, 1, 1]), 3);
});

test('随机面：只产出 0/1，且两种都会出现', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) C.randomFaces().forEach((f) => seen.add(f));
  assert.deepEqual([...seen].sort(), [0, 1]);
});

test('缓动：easeOut 边界为 0 与 1，且单调不减', () => {
  assert.equal(C.easeOut(0), 0);
  assert.equal(C.easeOut(1), 1);
  let prev = -1;
  for (let i = 0; i <= 20; i++) {
    const v = C.easeOut(i / 20);
    assert.ok(v >= prev);
    prev = v;
  }
});
