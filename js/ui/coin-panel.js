/* 铜钱摇卦面板：蓄力交互 + 六爻塔 + 音效开关，动画委托给 CoinCast。 */
(function (root) {
  'use strict';
  const YAO_NAME = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

  function mount(opts) {
    const $ = (id) => document.getElementById(id);
    const canvas = $('coin-canvas');
    const btn = $('btn-coin');
    const bar = $('power-bar');
    const hint = $('coin-hint');
    const stack = $('yao-stack');
    const soundBtn = $('btn-sound');
    if (!canvas) return null;

    const tosses = [];
    let stage = null;
    let busy = false;
    let charging = false;
    let power = 0;
    let chargeRaf = 0;
    let freshIdx = -1;

    function renderStack() {
      stack.innerHTML = YAO_NAME.map((name, i) => {
        const t = tosses[i];
        const fresh = i === freshIdx ? ' fresh' : '';
        if (!t) return `<div class="yao-slot empty"><span>${name}</span><i></i><b></b></div>`;
        return `<div class="yao-slot ${t.yang ? 'yang' : 'yin'}${t.moving ? ' mv' : ''}${fresh}">` +
          `<span>${name}</span><i></i><b>${t.label}${t.moving ? ' · 动' : ''}（${t.backs}背）</b></div>`;
      }).reverse().join('');
    }

    function setBtn() {
      const n = tosses.length;
      btn.textContent = n >= 6 ? '六爻已成' : `掷 第 ${n + 1} 爻`;
      btn.disabled = busy || n >= 6;
    }

    async function doToss(p) {
      if (busy || tosses.length >= 6) return;
      busy = true; setBtn();
      hint.classList.add('hide');
      const faces = await stage.toss(p);
      const backs = CoinCast.backsOf(faces);
      const line = Meihua.coinsToLine(backs);
      tosses.push({ ...line, backs });
      freshIdx = tosses.length - 1;
      stage.announce(line.label, line.moving);
      renderStack();
      busy = false; setBtn();
      if (tosses.length === 6) {
        stage.finale();
        setTimeout(() => opts.onComplete(tosses), 400);
      }
    }

    // ---- 蓄力 ----
    function tick() {
      power = Math.min(1, power + 0.022);
      bar.style.width = (power * 100).toFixed(0) + '%';
      if (charging) chargeRaf = requestAnimationFrame(tick);
    }
    function startCharge(e) {
      if (charging || busy || tosses.length >= 6) return;
      e.preventDefault();
      charging = true; power = 0.25;
      btn.classList.add('charging');
      tick();
    }
    function release() {
      if (!charging) return;
      charging = false;
      cancelAnimationFrame(chargeRaf);
      btn.classList.remove('charging');
      bar.style.width = '0%';
      doToss(power);
    }
    btn.addEventListener('pointerdown', startCharge);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !charging) startCharge(e); });
    btn.addEventListener('keyup', release);
    btn.addEventListener('click', (e) => e.preventDefault());

    function reset() {
      tosses.length = 0;
      freshIdx = -1;
      busy = false;
      hint.classList.remove('hide');
      stage.reset();
      renderStack(); setBtn();
    }
    $('btn-coin-reset').addEventListener('click', reset);

    soundBtn.addEventListener('click', () => {
      const on = !stage.getSound();
      stage.setSound(on);
      soundBtn.textContent = '音效：' + (on ? '开' : '关');
    });

    stage = CoinCast.create(canvas, {});
    renderStack(); setBtn();
    // 面板隐藏在未激活 tab 里时 clientWidth 为 0，画布必须在它可见后重算
    let lastW = 0;
    const refit = () => {
      if (canvas.clientWidth > 0 && canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; stage.refit(); }
    };
    new ResizeObserver(refit).observe(canvas);

    return { reset, refit, stage };
  }

  root.CoinPanel = { mount, YAO_NAME };
})(window);
