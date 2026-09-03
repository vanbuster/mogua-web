/* 起卦页控制器：三种起卦方式 → Meihua.analyze → GuaReading → 渲染；铜钱动画；AI 深读。 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const result = $('result');
  let current = null;

  GuaReading.TOPICS.forEach((t) => { const o = document.createElement('option'); o.value = t; o.textContent = t; $('q-topic').appendChild(o); });

  // ---- tabs ----
  let coinPanel = null;
  function showTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + name));
    if (name === 'coin' && coinPanel) coinPanel.refit();
  }
  document.querySelectorAll('.tab').forEach((t) => { t.onclick = () => { showTab(t.dataset.tab); history.replaceState(null, '', '#' + t.dataset.tab); }; });
  if (['time', 'num', 'coin'].includes(location.hash.slice(1))) showTab(location.hash.slice(1));

  function nowText() {
    const s = Solar.fromDate(new Date());
    const l = s.getLunar();
    return { solar: s, lunar: l, text: `${s.toYmdHms().slice(0, 16)} · 农历${l.getMonth() < 0 ? '闰' : ''}${l.getMonthInChinese()}月${l.getDayInChinese()} ${l.getTimeZhi()}时 · ${l.getYearInGanZhiByLiChun()}年` };
  }
  $('time-now').textContent = nowText().text;
  setInterval(() => { $('time-now').textContent = nowText().text; }, 30000);

  function aiPrompt() {
    const { a, R, meta } = current;
    return `请基于下面这一卦做深度解读（梅花易数体用法为主，卦辞爻辞为辅），针对所问之事给出：眼下局面、过程中的变数、最终走向、最该做的一件事与最该避的一件事。不要重复起卦过程。\n\n` +
      `起卦方式：${meta.method}；${meta.when}\n所问：${R.topic}${R.question ? '——' + R.question : ''}\n` +
      `本卦 ${a.ben.name}（上${a.ben.upper.name}下${a.ben.lower.name}），动爻 ${a.movingList.join('、') || '无'}\n互卦 ${a.hu.name}；变卦 ${a.bian.name}\n` +
      `体卦 ${a.ti.name}（${a.ti.wx}），用卦 ${a.yong.name}（${a.yong.wx}），${a.relation}；变卦用 ${a.bianYong.name} 对体 ${a.bianRel}\n` +
      `本卦卦辞：${a.ben.ci}\n变卦卦辞：${a.bian.ci}\n规则引擎初判：${R.verdict}。${R.main}`;
  }

  function show(cast, meta) {
    const a = Meihua.analyze(cast.lines, cast.movingList || [cast.moving]);
    const R = GuaReading.build(a, $('q-topic').value, $('q-text').value.trim());
    current = { a, R, meta };
    result.innerHTML = GuaRender.html(a, R, meta);
    $('ai').style.display = 'block';
    AI.mount($('ai'), aiPrompt);
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- 时间起卦 ----
  $('btn-time').onclick = () => {
    const n = nowText();
    const l = n.lunar;
    const cast = Meihua.castByTime({ yearZhiIndex: l.getYearZhiIndexByLiChun(), lunarMonth: l.getMonth(), lunarDay: l.getDay(), hourZhiIndex: l.getTimeZhiIndex() });
    show(cast, { sealText: '时卦', method: '梅花易数 · 时间起卦', when: n.text, formula: cast.formula });
  };

  // ---- 数字起卦 ----
  $('btn-num').onclick = () => {
    $('num-err').textContent = '';
    const nums = $('num-input').value.split(/[\s,，、/]+/).filter(Boolean).map((s) => parseInt(s, 10));
    if (!nums.length || nums.some((x) => !Number.isFinite(x) || x < 0) || nums.length > 3) { $('num-err').textContent = '请输入 1-3 个非负整数'; return; }
    if (nums.length === 1 && String(nums[0]).length < 2) { $('num-err').textContent = '单个数字至少两位，或改报两个数'; return; }
    const cast = Meihua.castByNumbers(nums);
    show(cast, { sealText: '数卦', method: '梅花易数 · 数字起卦', when: `所报之数：${nums.join('、')} · ${nowText().text}`, formula: cast.formula });
  };

  // ---- 铜钱摇卦 ----
  coinPanel = CoinPanel.mount({
    onComplete(tosses) {
      const cast = Meihua.castByCoins(tosses);
      const many = cast.movingList.length > 1;
      show(cast, {
        sealText: '钱卦', method: '铜钱六爻 · 摇卦',
        when: nowText().text + (many ? ' · 多爻动，体用取最上一动爻' : ''), formula: '',
      });
    },
  });
  if (document.getElementById('pane-coin').classList.contains('on')) coinPanel.refit();
})();
