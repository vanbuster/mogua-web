/* AI 深读面板：多家 provider（DeepSeek / 智谱 / Kimi / 通义 / Claude / 自定义），
   浏览器直连，Key 只存本机 localStorage，每家分开存、切换不丢。
   协议细节在 core/ai-providers.js，本文件只管 UI 与流式渲染。 */
(function (root) {
  'use strict';
  const P = root.AIProviders;
  const LS = {
    provider: 'mogua_ai_provider',
    model: (id) => 'mogua_ai_model_' + id,
    key: (id) => 'mogua_ai_key_' + id,
    endpoint: 'mogua_ai_endpoint_custom',
  };
  const SYSTEM = '你是一位熟读《滴天髓》《子平真诠》《梅花易数》的命理研究者，用简体中文、国风但不晦涩的语气作答。' +
    '结论先行，分段清晰，不用恐吓语，不给绝对化断语；涉及健康提醒以医学为准，涉及财务提醒理性决策。' +
    '篇幅 400-700 字。结尾一句：命理仅供参考，人生在于自身的努力和选择。';

  const get = (k, d) => localStorage.getItem(k) || d || '';
  const set = (k, v) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k));

  async function streamChat(opts, onDelta, onThink) {
    const req = P.buildRequest(opts);
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    if (!res.ok) throw new Error(P.explainError(res.status, await res.text()));
    const parse = P.makeParser(req.proto);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let stop = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const ev = parse(line.trim());
        if (!ev) continue;
        if (ev.text) onDelta(ev.text);
        else if (ev.think) onThink(ev.think);
        else if (ev.stop) stop = ev.stop;
      }
    }
    return stop;
  }

  function optionsHtml(list, cur) {
    return list.map(([v, label]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${label || v}</option>`).join('');
  }

  /** 在容器里挂一个 AI 深读框；buildPrompt() 返回要发给模型的正文 */
  function mount(container, buildPrompt) {
    const provIds = Object.keys(P.PROVIDERS);
    let pid = get(LS.provider, P.DEFAULT);
    if (!P.PROVIDERS[pid]) pid = P.DEFAULT;

    container.innerHTML = `<div class="ai-box">
      <div class="ai-head">
        <div><b class="ai-title">AI 深读</b><span class="muted">　浏览器直连，Key 只存在你自己的电脑里</span></div>
        <a class="muted ai-console" id="ai-console" target="_blank" rel="noopener">去拿 Key ↗</a>
      </div>
      <div class="ai-form">
        <div class="field"><label>模型平台</label>
          <select id="ai-prov">${optionsHtml(provIds.map((id) => [id, P.PROVIDERS[id].label]), pid)}</select></div>
        <div class="field" id="ai-model-wrap"><label>模型</label><select id="ai-model"></select></div>
        <div class="field" id="ai-endpoint-wrap" style="display:none"><label>接口地址</label>
          <input type="text" id="ai-endpoint" placeholder="https://…/v1/chat/completions"></div>
        <div class="field"><label>API Key</label><input type="password" id="ai-key" placeholder="sk-…"></div>
        <div class="field"><button class="btn" id="ai-go">深　读</button></div>
      </div>
      <div class="ai-hint muted" id="ai-hint"></div>
      <div class="ai-think" id="ai-think" style="display:none"></div>
      <div class="ai-out" id="ai-out"></div></div>`;

    const $ = (id) => container.querySelector('#' + id);
    const provSel = $('ai-prov'); const modelSel = $('ai-model'); const keyIn = $('ai-key');
    const endpointIn = $('ai-endpoint'); const btn = $('ai-go');
    const out = $('ai-out'); const think = $('ai-think'); const hint = $('ai-hint'); const consoleLink = $('ai-console');

    function syncProvider() {
      const p = P.PROVIDERS[pid];
      const isCustom = pid === 'custom';
      $('ai-model-wrap').style.display = isCustom ? 'none' : '';
      $('ai-endpoint-wrap').style.display = isCustom ? '' : 'none';
      modelSel.innerHTML = optionsHtml(p.models, get(LS.model(pid), p.models[0] && p.models[0][0]));
      if (isCustom) {
        modelSel.innerHTML = '';
        endpointIn.value = get(LS.endpoint);
      }
      keyIn.value = get(LS.key(pid));
      keyIn.placeholder = p.placeholder || 'sk-…';
      hint.textContent = p.hint || '';
      consoleLink.style.display = p.console ? '' : 'none';
      consoleLink.href = p.console || '#';
    }
    syncProvider();

    // 自定义平台需要手填模型名：把 select 换成 input
    function customModelInput() {
      if (pid !== 'custom') return null;
      let el = container.querySelector('#ai-model-custom');
      if (!el) {
        const wrap = document.createElement('div');
        wrap.className = 'field';
        wrap.innerHTML = '<label>模型名</label><input type="text" id="ai-model-custom" placeholder="如 deepseek-chat">';
        $('ai-endpoint-wrap').after(wrap);
        el = wrap.querySelector('input');
        el.value = get(LS.model('custom'));
      }
      el.parentElement.style.display = '';
      return el;
    }
    function toggleCustomModel() {
      const el = container.querySelector('#ai-model-custom');
      if (pid === 'custom') customModelInput();
      else if (el) el.parentElement.style.display = 'none';
    }
    toggleCustomModel();

    provSel.onchange = () => {
      pid = provSel.value;
      set(LS.provider, pid);
      syncProvider();
      toggleCustomModel();
    };
    modelSel.onchange = () => set(LS.model(pid), modelSel.value);

    btn.onclick = async () => {
      const customModel = container.querySelector('#ai-model-custom');
      const model = pid === 'custom' ? (customModel ? customModel.value.trim() : '') : modelSel.value;
      set(LS.key(pid), keyIn.value.trim());
      set(LS.model(pid), model);
      if (pid === 'custom') set(LS.endpoint, endpointIn.value.trim());

      btn.disabled = true;
      think.style.display = 'none'; think.textContent = '';
      out.innerHTML = '<span class="spinner"></span>研墨中…';
      let text = ''; let reasoning = '';
      try {
        const stop = await streamChat(
          { provider: pid, model, key: keyIn.value.trim(), endpoint: endpointIn.value.trim(), system: SYSTEM, prompt: buildPrompt() },
          (d) => { text += d; out.textContent = text; },
          (d) => {
            reasoning += d;
            think.style.display = '';
            think.textContent = '推演：' + reasoning;
            think.scrollTop = think.scrollHeight;
          },
        );
        if (stop === 'refusal') out.textContent += '\n\n（模型未作回答，换个问法再试。）';
        if (!text) out.textContent = reasoning ? '（模型只输出了推演过程，未给结论，可重试一次）' : '（未返回内容）';
      } catch (e) {
        console.error('AI 深读失败', e);
        out.textContent = e.message;
      } finally {
        btn.disabled = false;
      }
    };
  }

  root.AI = { mount, streamChat, SYSTEM };
})(window);
