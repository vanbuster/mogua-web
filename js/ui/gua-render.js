/* 卦象渲染：六爻画法（阳实线 / 阴断线 / 动爻朱砂）、三卦并列、解答区。 */
(function (root) {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function yao(lines, movingList) {
    return `<div class="yao">${lines.map((v, i) => `<div class="l ${v ? 'yang' : 'yin'} ${movingList.includes(i + 1) ? 'mv' : ''}"><i></i></div>`).join('')}</div>`;
  }

  function guaBox(title, hex, movingList, cls) {
    return `<div class="gua-box ${cls || ''}"><h4>${title}</h4>${yao(hex.lines, movingList)}
      <div class="gua-name">${hex.name}</div><div class="gua-sym">${hex.upper.sym}${hex.upper.name}${hex.upper.nature} 上 · ${hex.lower.sym}${hex.lower.name}${hex.lower.nature} 下 · 第 ${hex.n} 卦</div></div>`;
  }

  function html(a, R, meta) {
    const mvText = a.movingList.length ? `动爻：${a.movingList.map((n) => ['初', '二', '三', '四', '五', '上'][n - 1] + '爻').join('、')}` : '静卦（无动爻）';
    return `
  <header class="hero"><div class="seal"><span>${esc(meta.sealText)}</span></div>
    <h1>${esc(a.ben.name)}</h1>
    <div class="subtitle">${esc(meta.method)}　·　${mvText}　·　问 <b>${esc(R.topic)}</b>${R.question ? '：' + esc(R.question) : ''}</div>
    <div class="subtitle" style="margin-top:6px">${esc(meta.when)}</div></header>
  <section class="card"><div class="card-title">本　互　变　三　卦</div>
    <div class="gua-grid">${guaBox('本卦 · 当下', a.ben, a.movingList, 'ben')}${guaBox('互卦 · 过程', a.hu, [])}${guaBox('变卦 · 结局', a.bian, [])}</div>
    ${meta.formula ? `<div class="formula">${esc(meta.formula)}</div>` : ''}</section>
  <section class="card reading"><div class="card-title">断　语</div>
    <div class="verdict lv${R.level}">${R.verdict}</div>
    <p><b>总断：</b>${esc(R.main)}</p>
    <p><b>体用：</b>${esc(R.tiyong)}</p>
    ${R.process ? `<p><b>过程：</b>${esc(R.process)}</p>` : ''}
    ${R.ending ? `<p><b>结局：</b>${esc(R.ending)}</p>` : ''}
    <p><b>卦辞：</b>${esc(R.ci)}</p>
    <p class="muted">${esc(a.ben.duan)}</p></section>`;
  }

  root.GuaRender = { html, yao };
})(window);
