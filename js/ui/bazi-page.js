/* 八字页控制器：表单 → 引擎 → 看板；分享链接 / 下载 / AI 深读。 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('bazi-form');
  const result = $('result');
  let current = null;

  function readForm() {
    const date = $('f-date').value;
    if (!date) throw new Error('请填写公历出生日期');
    const [y, m, d] = date.split('-').map(Number);
    const unknown = $('f-unknown').checked;
    const [hh, mm] = ($('f-time').value || '12:00').split(':').map(Number);
    return { name: $('f-name').value.trim(), year: y, month: m, day: d, hour: hh, minute: mm, gender: Number($('f-gender').value), hourKnown: !unknown };
  }

  function fillForm(o) {
    $('f-name').value = o.n || '';
    $('f-date').value = `${o.y}-${String(o.m).padStart(2, '0')}-${String(o.d).padStart(2, '0')}`;
    $('f-time').value = o.t || '12:00';
    $('f-gender').value = o.g === '0' ? '0' : '1';
    $('f-unknown').checked = o.u === '1';
  }

  function toHash(i) {
    return Share.encode({ n: i.name, y: i.year, m: i.month, d: i.day, t: i.hourKnown ? `${String(i.hour).padStart(2, '0')}:${String(i.minute).padStart(2, '0')}` : '', g: i.gender, u: i.hourKnown ? '' : '1' });
  }

  function aiPrompt() {
    const c = current.chart; const R = current.reading;
    const months = c.months.map((m) => `${m.gz}(${m.level === 'g' ? '顺' : m.level === 'r' ? '险' : '平'}${m.notes.length ? '：' + m.notes.join('/') : ''})`).join('、');
    return `请基于下面这张已排好的八字盘做深度论断，重点讲：格局高低、用神是否到位、当前大运与流年的具体机会与风险、未来一年最该做与最该避的事。不要重复排盘过程。\n\n` +
      `${c.name || '命主'}，${c.gender}，公历 ${c.solarText}，农历 ${c.lunarText}。\n八字：${c.bazi}（日主${c.dayGan}${c.dayWx}）\n` +
      `十神：${c.pillars.filter(Boolean).map((p) => p.label + p.god).join('，')}\n藏干：${c.pillars.filter(Boolean).map((p) => p.zhi + '藏' + p.hidden.map((h) => h.gan + h.god).join('/')).join('；')}\n` +
      `五行加权：${Object.entries(c.wuxing.pct).map(([k, v]) => k + v + '%').join(' ')}\n旺衰：${c.strength.reason}\n格局：${c.pattern.name}\n` +
      `大运：${c.dayun.map((d) => d.gz + '(' + d.startAge + '-' + d.endAge + '岁' + (d.isNow ? '·当下' : '') + ')').join(' ')}\n` +
      `流年 ${c.now.liunian.gz}：${c.now.liunian.notes.join('、') || '无显著冲合'}\n流月：${months}\n神煞：${c.shensha.map((s) => s.name + '在' + s.at).join('，') || '无'}；空亡 ${c.xunkong}\n` +
      `规则引擎的初判：${R.pattern} ${R.career}`;
  }

  function render(input) {
    const chart = BaziEngine.compute({ ...input, now: new Date() });
    const reading = BaziReading.build(chart);
    current = { chart, reading, input };
    result.innerHTML = BaziRender.html(chart, reading);
    $('actions').style.display = 'flex';
    $('ai').style.display = 'block';
    AI.mount($('ai'), aiPrompt);
    setTimeout(() => document.querySelectorAll('.wx-bar').forEach((b) => { b.style.width = b.dataset.w + '%'; }), 150);
    history.replaceState(null, '', toHash(input));
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    $('f-err').textContent = '';
    try { render(readForm()); } catch (err) { console.error(err); $('f-err').textContent = err.message; }
  });
  $('f-unknown').addEventListener('change', (e) => { $('f-time').disabled = e.target.checked; });

  $('btn-share').onclick = async () => {
    const ok = await Share.copy(location.href.split('#')[0] + toHash(current.input));
    $('btn-share').textContent = ok ? '已复制 ✓' : '复制分享链接';
    setTimeout(() => { $('btn-share').textContent = '复制分享链接'; }, 1500);
  };
  $('btn-download').onclick = () => Share.downloadStandalone(`命盘·${current.chart.bazi}`, result.innerHTML, `mogua-命盘-${current.chart.bazi.replace(/ /g, '')}.html`);
  $('btn-print').onclick = () => window.print();

  const h = Share.decode();
  if (h && h.y) {
    fillForm(h);
    $('f-time').disabled = $('f-unknown').checked;
    try { render(readForm()); } catch (err) { console.error(err); $('f-err').textContent = err.message; }
  }
})();
