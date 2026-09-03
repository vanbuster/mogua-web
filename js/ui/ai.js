/* AI 深读：用户自带 Claude API Key（只存 localStorage，直连 Anthropic，不经任何中间服务器）。
   规则引擎的结论已经给出，这里只做「更细的论断」增强，不是必需路径。 */
(function (root) {
  'use strict';
  const KEY = 'mogua_api_key';
  const ENDPOINT = 'https://api.anthropic.com/v1/messages';
  const MODEL = 'claude-opus-5';
  const SYSTEM = '你是一位熟读《滴天髓》《子平真诠》《梅花易数》的命理研究者，用简体中文、国风但不晦涩的语气作答。' +
    '结论先行，分段清晰，不用恐吓语，不给绝对化断语；涉及健康提醒以医学为准，涉及财务提醒理性决策。' +
    '篇幅 400-700 字。结尾一句：命理仅供参考，人生在于自身的努力和选择。';

  const getKey = () => localStorage.getItem(KEY) || '';
  const setKey = (k) => (k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY));

  async function stream(userText, onDelta) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify({
        model: MODEL, max_tokens: 4000, stream: true, system: SYSTEM,
        fallbacks: 'default',
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let stopReason = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const ev = JSON.parse(line.slice(5).trim());
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') onDelta(ev.delta.text);
        if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
      }
    }
    return stopReason;
  }

  /** 在容器里挂一个 AI 深读框；buildPrompt() 返回要发给模型的正文 */
  function mount(container, buildPrompt) {
    container.innerHTML = `<div class="ai-box">
      <div class="row" style="justify-content:space-between">
        <div><b style="letter-spacing:3px">AI 深读</b><span class="muted">　自带 Claude API Key，浏览器直连，密钥只存本机</span></div>
        <div class="row"><input type="password" id="ai-key" placeholder="sk-ant-…" style="width:220px" value="${getKey()}">
          <button class="btn small" id="ai-go">深读此盘</button></div>
      </div>
      <div class="ai-out" id="ai-out"></div></div>`;
    const out = container.querySelector('#ai-out');
    const btn = container.querySelector('#ai-go');
    const keyInput = container.querySelector('#ai-key');
    btn.onclick = async () => {
      setKey(keyInput.value.trim());
      if (!getKey()) { out.textContent = '请先填入 API Key。'; return; }
      btn.disabled = true;
      out.innerHTML = '<span class="spinner"></span>研墨中…';
      let text = '';
      try {
        const stop = await stream(buildPrompt(), (d) => { text += d; out.textContent = text; });
        if (stop === 'refusal') out.textContent += '\n\n（模型对本次内容未作回答，请换个问法。）';
        if (!text) out.textContent = '（未返回内容）';
      } catch (e) {
        console.error('AI 深读失败', e);
        out.textContent = '请求失败：' + e.message;
      } finally {
        btn.disabled = false;
      }
    };
  }

  root.AI = { mount, stream, getKey, setKey };
})(window);
