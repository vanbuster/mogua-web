/* 铜钱摇卦动画引擎：Canvas 2D 伪 3D 铜钱 + 卦坛 + 粒子 + 合成音效。
   结果先由 crypto 定，动画只负责把三枚铜钱演出到既定的正反面（游戏抽签的通行做法）。
   顶层不触碰 document，故 Node 可 require 其纯函数部分做测试。 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  // ---------- 纯函数 ----------
  /** 渲染约定：cos(spin) >= 0 显示「字」面(0)，否则显示「背」面(1) */
  function landingSpin(cur, face, minTurns) {
    const want = face === 1 ? Math.PI : 0;
    const base = cur + (minTurns || 0) * TAU;
    let k = Math.ceil((base - want) / TAU);
    let t = want + k * TAU;
    if (t <= base + 1e-9) t += TAU;
    return t;
  }
  const backsOf = (faces) => faces.reduce((a, b) => a + b, 0);
  function randomFaces() {
    const buf = (root.crypto || globalThis.crypto).getRandomValues(new Uint8Array(3));
    return [buf[0] & 1, buf[1] & 1, buf[2] & 1];
  }
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  /** 归一化时间 → 竖直位置系数（1 = 空中最高，0 = 落地），含两次弹跳 */
  function bounceAt(u) {
    if (u < 0.5) { const k = u / 0.5; return 1 - k * k; }
    if (u < 0.76) { const k = (u - 0.5) / 0.26; return 0.2 * 4 * k * (1 - k); }
    if (u < 0.92) { const k = (u - 0.76) / 0.16; return 0.07 * 4 * k * (1 - k); }
    return 0;
  }

  // ---------- 音效（WebAudio 合成，无外部资源） ----------
  function makeAudio() {
    let ctx = null; let on = true;
    const ensure = () => {
      try {
        if (!ctx && (root.AudioContext || root.webkitAudioContext)) ctx = new (root.AudioContext || root.webkitAudioContext)();
        if (ctx && ctx.state === 'suspended') ctx.resume().catch((e) => console.warn('audio resume failed', e));
      } catch (e) {
        // 音频不可用不该拖垮摇卦本身
        console.warn('AudioContext unavailable', e);
        on = false;
      }
      return ctx;
    };
    function clink(gain, freq) {
      const c = ensure();
      if (!c || !on) return;
      const t = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.3);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.45);
    }
    function chime() {
      const c = ensure();
      if (!c || !on) return;
      [523.25, 783.99, 1046.5].forEach((f, i) => {
        const t = c.currentTime + i * 0.09;
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 1.2);
      });
    }
    return { clink, chime, unlock: ensure, set: (v) => { on = v; }, get: () => on };
  }

  // ---------- 渲染 ----------
  function drawCoin(ctx, c, colors) {
    const cos = Math.cos(c.spin);
    const flat = Math.abs(cos);
    const isBack = cos < 0;
    const r = c.r;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.tilt);
    ctx.scale(1, Math.max(0.035, flat)); // 压扁 = 绕水平轴翻转的投影

    // 侧边厚度（压扁后仍可见的一条暗金）
    const th = (r * 0.16) / Math.max(0.12, flat);
    ctx.beginPath(); ctx.arc(0, th, r, 0, TAU);
    ctx.fillStyle = colors[3]; ctx.fill();

    // 币身金属渐变
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, colors[0]); g.addColorStop(0.35, colors[1]);
    g.addColorStop(0.62, colors[2]); g.addColorStop(1, colors[3]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = r * 0.09; ctx.strokeStyle = colors[3]; ctx.stroke();

    // 高光弧
    ctx.beginPath(); ctx.arc(0, 0, r * 0.86, Math.PI * 1.05, Math.PI * 1.55);
    ctx.lineWidth = r * 0.1; ctx.strokeStyle = 'rgba(255,248,214,.75)'; ctx.stroke();

    // 方孔
    const h = r * 0.3;
    ctx.beginPath(); ctx.rect(-h, -h, h * 2, h * 2);
    ctx.fillStyle = 'rgba(38,28,14,.92)'; ctx.fill();
    ctx.lineWidth = r * 0.06; ctx.strokeStyle = colors[3]; ctx.stroke();

    ctx.fillStyle = '#4a3410';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (isBack) {
      // 背面：素面双弧 + 满文式竖纹
      ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, TAU);
      ctx.lineWidth = r * 0.045; ctx.strokeStyle = 'rgba(90,68,26,.55)'; ctx.stroke();
      ctx.lineWidth = r * 0.07; ctx.strokeStyle = 'rgba(74,52,16,.8)';
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.52, -r * 0.3); ctx.lineTo(s * r * 0.52, r * 0.3);
        ctx.moveTo(s * r * 0.38, -r * 0.16); ctx.lineTo(s * r * 0.66, -r * 0.16);
        ctx.stroke();
      });
    } else {
      ctx.font = `bold ${r * 0.42}px STKaiti,KaiTi,serif`;
      const p = r * 0.62;
      ctx.fillText('乾', 0, -p); ctx.fillText('隆', 0, p);
      ctx.fillText('通', -p, 0); ctx.fillText('宝', p, 0);
    }
    ctx.restore();
  }

  function create(canvas, opts) {
    const o = opts || {};
    const ctx = canvas.getContext('2d');
    const audio = makeAudio();
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0; let H = 0; let dpr = 1;
    let coins = []; let parts = []; let ripples = [];
    let dialRot = 0; let glow = 0; let flash = 0; let shake = 0;
    let label = { text: '', life: 0 };
    let tossWaits = 0;
    let raf = 0; let last = 0; let running = false;
    const COLORS = ['#f6e6ae', '#dcbc6f', '#b08a3e', '#7a5a16'];
    const TRI = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];

    /** 返回是否拿到了有效尺寸。脚本在布局完成前跑时 clientWidth 会是 0，需向父级兜底 */
    function resize() {
      dpr = Math.min(root.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      W = canvas.clientWidth || (parent && parent.clientWidth) || 0;
      H = canvas.clientHeight || (parent && parent.clientHeight) || 0;
      if (!W || !H) return false;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function seats() {
      const cx = W / 2; const cy = H * 0.62;
      const rd = Math.min(W * 0.4, H * 0.44);
      const r = Math.max(20, Math.min(rd * 0.3, 34));
      return [-1, 0, 1].map((i) => ({ x: cx + i * rd * 0.52, y: cy + (i === 0 ? rd * 0.16 : 0), r, cx, cy, rd }));
    }

    function drawDial() {
      const s = seats()[1];
      ctx.save(); ctx.translate(s.cx, s.cy); ctx.scale(1, 0.42);
      ctx.beginPath(); ctx.arc(0, 0, s.rd * 1.28, 0, TAU);
      ctx.fillStyle = 'rgba(120,90,40,.10)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(120,90,40,.30)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s.rd * 0.92, 0, TAU);
      ctx.strokeStyle = 'rgba(120,90,40,.22)'; ctx.stroke();
      if (glow > 0) {
        ctx.beginPath(); ctx.arc(0, 0, s.rd * (1.28 + (1 - glow) * 0.3), 0, TAU);
        ctx.lineWidth = 3; ctx.strokeStyle = `rgba(176,138,62,${glow * 0.6})`; ctx.stroke();
      }
      ctx.restore();
      ctx.save(); ctx.translate(s.cx, s.cy);
      ctx.font = `${Math.max(13, s.rd * 0.17)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(120,90,40,${0.34 + glow * 0.4})`;
      TRI.forEach((t, i) => {
        const a = dialRot + (i / 8) * TAU;
        ctx.fillText(t, Math.cos(a) * s.rd * 1.45, Math.sin(a) * s.rd * 1.45 * 0.42);
      });
      ctx.restore();
    }

    function drawShadow(c, ground) {
      const hgt = Math.max(0, ground - c.y);
      const k = 1 - Math.min(1, hgt / (c.r * 7));
      ctx.save(); ctx.translate(c.x, ground + c.r * 0.5); ctx.scale(1, 0.3);
      ctx.beginPath(); ctx.arc(0, 0, c.r * (1.35 - k * 0.35), 0, TAU);
      ctx.fillStyle = `rgba(60,44,18,${0.06 + k * 0.22})`; ctx.fill();
      ctx.restore();
    }

    function spawnParts(x, y, n, strong) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI * (0.15 + Math.random() * 0.7);
        const sp = (strong ? 1.6 : 0.9) * (30 + Math.random() * 90);
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, r: 1.2 + Math.random() * 2.4, ink: Math.random() < 0.35 });
      }
      ripples.push({ x, y, r: 4, life: 1 });
    }

    function step(dt) {
      dialRot += dt * 0.08;
      glow = Math.max(0, glow - dt * 0.9);
      if (label.life > 0) label.life = Math.max(0, label.life - dt * 0.62);
      flash = Math.max(0, flash - dt * 1.6);
      shake = Math.max(0, shake - dt * 6);
      parts = parts.filter((p) => {
        p.life -= dt * 1.5; p.vy += 620 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        return p.life > 0;
      });
      ripples = ripples.filter((r) => { r.life -= dt * 1.6; r.r += dt * 150; return r.life > 0; });
      coins.forEach((c) => {
        if (!c.anim) return;
        c.t += dt;
        const u = Math.min(1, Math.max(0, (c.t - c.delay) / c.dur));
        if (u <= 0) return;
        const e = easeOut(u);
        c.x = lerp(c.fromX, c.toX, e);
        c.y = c.ground - bounceAt(u) * c.lift;
        c.spin = lerp(0, c.spinTo, e);
        c.tilt = lerp(c.tiltFrom, 0, e);
        c.hits.forEach((h) => {
          if (!h.done && u >= h.at) {
            h.done = true;
            spawnParts(c.x, c.ground + c.r * 0.4, h.big ? 9 : 4, h.big);
            audio.clink(h.big ? 0.16 : 0.07, 880 + Math.random() * 260);
            if (h.big) shake = 1;
          }
        });
        if (u >= 1) { c.anim = false; c.spin = c.spinTo; }
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 4, (Math.random() - 0.5) * shake * 3);
      drawDial();
      ripples.forEach((r) => {
        ctx.save(); ctx.translate(r.x, r.y); ctx.scale(1, 0.32);
        ctx.beginPath(); ctx.arc(0, 0, r.r, 0, TAU);
        ctx.lineWidth = 2; ctx.strokeStyle = `rgba(165,41,41,${r.life * 0.4})`; ctx.stroke();
        ctx.restore();
      });
      coins.forEach((c) => drawShadow(c, c.ground));
      coins.forEach((c) => {
        if (c.trail && c.anim) {
          c.trail.push({ x: c.x, y: c.y, spin: c.spin, tilt: c.tilt, r: c.r });
          if (c.trail.length > 5) c.trail.shift();
          c.trail.forEach((t, i) => {
            ctx.save(); ctx.globalAlpha = (i / c.trail.length) * 0.22;
            drawCoin(ctx, t, COLORS); ctx.restore();
          });
        }
        drawCoin(ctx, c, COLORS);
      });
      parts.forEach((p) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, TAU);
        ctx.fillStyle = p.ink ? `rgba(48,36,20,${p.life * 0.5})` : `rgba(226,196,110,${p.life * 0.9})`;
        ctx.fill();
      });
      if (label.life > 0) {
        const s = seats()[1];
        const rise = (1 - label.life) * 26;
        ctx.save();
        ctx.globalAlpha = Math.min(1, label.life * 1.6);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.max(22, s.rd * 0.34)}px STKaiti,KaiTi,serif`;
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,248,228,.85)';
        ctx.strokeText(label.text, s.cx, s.cy - s.rd * 0.72 - rise);
        ctx.fillStyle = label.hot ? '#a52929' : '#4a3d28';
        ctx.fillText(label.text, s.cx, s.cy - s.rd * 0.72 - rise);
        ctx.restore();
      }
      ctx.restore();
      if (flash > 0) { ctx.fillStyle = `rgba(255,244,214,${flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
    }

    function loop(ts) {
      const dt = Math.min(0.05, (ts - last) / 1000 || 0);
      last = ts;
      step(dt); draw();
      if (running) raf = requestAnimationFrame(loop);
    }

    function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    function place(faces) {
      const st = seats();
      coins = st.map((s, i) => ({
        x: s.x, y: s.y, r: s.r, ground: s.y, tilt: 0,
        spin: faces ? (faces[i] === 1 ? Math.PI : 0) : 0, anim: false, trail: null,
      }));
    }

    /** 重算画布尺寸并把铜钱摆回坛位，保留当前正反面。tab 切换 / 窗口缩放时调用 */
    function refit() {
      if (!resize()) { setTimeout(refit, 80); return; }
      if (!coins.length) { place(null); draw(); return; }
      const st = seats();
      coins.forEach((c, i) => {
        if (!st[i] || c.anim) return;
        c.x = st[i].x; c.y = st[i].y; c.r = st[i].r; c.ground = st[i].y;
      });
      draw();
    }

    function reset() {
      if (!resize()) { setTimeout(reset, 80); return; }
      place(null); parts = []; ripples = []; glow = 0; flash = 0;
      label = { text: '', life: 0 };
      draw();
    }

    /** 落定后在坛上浮出结果字样（老阳 / 少阴…），hot = 动爻用朱砂 */
    function announce(text, hot) { label = { text, hot: !!hot, life: 1 }; start(); }

    /** 播放一次投掷。power 0~1 影响抛高与翻滚圈数。resolve 出 faces */
    function toss(power) {
      audio.unlock();
      const p = Math.max(0.25, Math.min(1, power || 0.5));
      const faces = randomFaces();
      resize();
      if (!W || !H) {
        // 画布尚未布局（刚切到本 tab，或页面在后台不渲染）。重试用 setTimeout 而非 rAF：
        // 后台标签页里 rAF 根本不回调，会让掷卦按钮永久卡在禁用态。
        if (tossWaits++ > 12) { W = W || 560; H = H || 320; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
        else return new Promise((res) => { setTimeout(() => toss(power).then(res), 80); });
      }
      tossWaits = 0;
      const st = seats();
      const dur = reduce ? 0.2 : 1.15 + p * 0.55;
      coins = st.map((s, i) => {
        const turns = reduce ? 0 : Math.round(4 + p * 7 + Math.random() * 2);
        return {
          x: 0, y: 0, r: s.r, ground: s.y, tilt: 0,
          fromX: W * (0.16 + i * 0.02) + (Math.random() - 0.5) * 20,
          toX: s.x, lift: (H * 0.55 + p * H * 0.4) * (0.85 + Math.random() * 0.3),
          tiltFrom: (Math.random() - 0.5) * 1.4,
          spin: 0, spinTo: landingSpin(0, faces[i], turns),
          t: 0, delay: i * 0.07, dur, anim: true, trail: [],
          hits: reduce ? [] : [{ at: 0.5, big: true, done: false }, { at: 0.76, big: false, done: false }, { at: 0.92, big: false, done: false }],
        };
      });
      start();
      return new Promise((resolve) => {
        setTimeout(() => {
          glow = 1; flash = 0.6;
          const st2 = seats();
          st2.forEach((s) => spawnParts(s.x, s.y + s.r * 0.4, 6, false));
          audio.chime();
          if (o.onSettle) o.onSettle(faces, backsOf(faces));
          resolve(faces);
        }, (dur + 0.16 + coins.length * 0.07) * 1000);
      });
    }

    function finale() {
      flash = 1; glow = 1; audio.chime();
      const s = seats()[1];
      for (let i = 0; i < 26; i++) spawnParts(s.cx + (Math.random() - 0.5) * s.rd * 2, s.cy, 1, true);
    }

    const onResize = () => { resize(); draw(); };
    root.addEventListener('resize', onResize);
    reset();

    return {
      toss, reset, refit, finale, announce, start, stop,
      setSound: (v) => audio.set(v), getSound: () => audio.get(),
      destroy: () => { stop(); root.removeEventListener('resize', onResize); },
    };
  }

  const API = { landingSpin, backsOf, randomFaces, easeOut, bounceAt, create };
  root.CoinCast = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
