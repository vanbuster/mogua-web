# 墨卦 · 赛博算命（Web）

把 [bazi-skill](../bazi-skill/)（只有装了 Claude Code 的人才能用的八字 skill）做成**人人可玩的静态网页**，
沿用它的国风水墨美术系统（宣纸 / 朱砂印 / 楷体 / 五行五色 / 雷达图），并加入起卦问事。

> 🌐 **线上入口：https://vanbuster.github.io/mogua-web/** （2026-09-03 上线）

## 产出清单

| 页面 | 功能 |
|---|---|
| `index.html` | 首页：四入口 + 今日黄历（宜忌 / 吉神方位 / 冲煞 / 下一节气） |
| `bazi.html` | 八字命盘：四柱 / 十神 / 藏干 / 纳音 / 十二长生 / 五行雷达 + 加权条 / 大运时间轴 / 当下气运三卡 / 十二流月红绿灯 / 未来五年 / 综合论命六宫格 / 命格特质（神煞）/ 开运方位色数；分享链接（URL hash）/ 下载零依赖单文件看板 / 打印 |
| `qigua.html` | 起卦问事：**临时起卦**（梅花易数时间起卦）/ **数字起卦**（1-3 个数）/ **铜钱摇卦**（Canvas 卦坛，见下）→ 本卦·互卦·变卦 + 体用生克 + 按类别（综合/事业/感情/财运/学业/健康/出行）断语 + 卦辞原文 |
| AI 深读（两页都有） | 可选：自带任一家的 API Key，浏览器直连，密钥只存本机 localStorage，不经任何中间服务器。规则引擎的结论不依赖它，没 Key 也能完整玩 |

## AI 深读支持哪些平台

| 平台 | 协议 | 备注 |
|---|---|---|
| **DeepSeek 深度求索**（默认） | OpenAI 兼容 | 国内最容易拿到的 Key，手机号注册即可。**V4 Flash / V4 Pro**，1M 上下文；思考深度可选（浅思/深思/极思/不思考），推演过程单独渲染 |
| 智谱 GLM | OpenAI 兼容 | `glm-4-flash` 长期免费 |
| 月之暗面 Kimi | OpenAI 兼容 | 注册赠额度 |
| 通义千问 · 阿里百炼 | OpenAI 兼容 | DashScope compatible-mode |
| Claude · Anthropic | Anthropic Messages | 需境外支付方式 |
| 自定义 | OpenAI 兼容 | 填 baseURL + 模型名，可接 one-api / 硅基流动 / 本地 Ollama 网关 |

四家国内平台**实测均放行浏览器直连**（CORS 通过），所以不需要自建代理。Key 按平台分开存 localStorage，切换平台不会丢。协议差异收敛在 `js/core/ai-providers.js`（纯函数，有测试）。

**DeepSeek V4 的接口变化**（2026-09 起）：不再用不同模型 ID 区分是否推理（旧的 `deepseek-chat` / `deepseek-reasoner` 已不在文档模型表内），改为两个**顶层**请求参数 `thinking: {type: "enabled"|"disabled"}` 与 `reasoning_effort: "low"|"high"|"max"`。这两个字段只发给 DeepSeek，别家会报错。本站默认 `V4 Flash + 浅思`——命理解读不吃深推理，浅思又快又便宜，推演区照样有内容可看。存在 localStorage 里的旧模型名会自动迁移到 V4（`resolveModel`）。

## 动效

- **进场**：滚动到视口才播（IntersectionObserver），卡片淡入上浮 + 朱砂竖线自上而下生长
- **四柱**：逐柱 3D 翻入，干支大字墨迹从模糊渗到清晰
- **五行**：雷达多边形自圆心展开、顶点依次弹出，百分比数字滚动，进度条延时填充
- **大运**：金线自左向右描绘，节点依次浮现，当前大运脉冲呼吸
- **流月**：十二格波浪式点亮，当前月描边呼吸；凶象卡片朱砂微光
- **卦象**：六爻自下而上落笔（阳爻一笔、阴爻两侧对开），判词与卷首印章从上方落下压实
- **交互**：入口卡片墨韵跟随鼠标、按钮按下墨点扩散、悬停微浮

实现在 `css/motion.css`（动画本体）+ `js/ui/reveal.js`（何时动、第几个动），与版式样式分离。全部动效在 `prefers-reduced-motion` 和打印时关闭。

**渐进增强**：百分比数字、五行条、导出的单文件看板都不依赖动画帧——后台标签页里 rAF 与 IntersectionObserver 不回调时，内容直接停在终值，不会卡在初始态。

## 铜钱摇卦的动画

按住「掷」键蓄力、松手落坛，一次完整演出：铜钱自画面外抛入 → 空中翻滚（伪 3D 压扁投影 + 拖影）→ 落坛弹跳两次 → 溅出金粉与墨点、朱砂涟漪扩散、坛面震动 → 坛上浮出「老阳／少阴」结果字 → 爻线滑入右侧六爻塔。六爻集齐时全屏金光 + 合成钟声。

- **Canvas 2D 手写渲染**，无 Three.js 无图片无音频文件。铜钱正面画「乾隆通宝」、背面画满文式竖纹，金属渐变 + 高光弧 + 方孔 + 厚度侧边
- **音效用 WebAudio 实时合成**（落地金属声、成卦钟声），可一键静音；首次按住时解锁 AudioContext
- **结果先定、动画后演**：三枚铜钱的正反面由 `crypto.getRandomValues` 先决定，翻滚角度再收敛到既定面（`landingSpin`）。**蓄力力度只影响抛高与翻滚圈数，不影响结果**，页面上明确写了这句
- 尊重 `prefers-reduced-motion`：动画压到 0.2 秒、不弹跳不溅射
- 逻辑与渲染分离：`coin-cast.js` 顶层不碰 `document`，纯函数（落定角、缓动、弹跳曲线）在 Node 里有测试

## 技术

- **零构建、零运行时依赖**：纯 HTML/CSS/JS，任何静态托管（GitHub Pages / Vercel / 飞书妙搭）直接可用
- 历法底座：[lunar-javascript 1.7.7](https://github.com/6tail/lunar-javascript)（MIT，已 vendor 到 `js/vendor/`），节气精确到分钟，负责四柱 / 大运 / 农历 / 黄历
- 口径：年柱以立春为界、月柱以节气为界、23:00 后日柱算次日（早晚子时法，与 skill 一致）
- 五行量化：天干 1.0，藏干本气 0.6 / 中气 0.3 / 余气 0.1，最大余数法取整（与 skill `chart-calculation.md` §2 一致）
- 旺衰：印比合计 + 月令得失 → 身旺 / 中和 / 身弱 → 喜忌五行；红绿灯按冲合刑害 + 喜忌 + 伤官见官 / 七杀攻身评分
- 梅花易数：先天卦数（乾一…坤八）、余 0 作 8、动爻余 0 作 6；多爻动时体用取最上一动爻（简化约定，页面会标注）
- AI 深读：六家 provider，两种协议适配，流式 SSE；Anthropic 侧处理 `refusal`

```
mogua-web/
├── index.html / bazi.html / qigua.html
├── css/ink.css                 ← 设计系统（沿用 bazi-skill dashboard-sop.md tokens）
├── css/motion.css              ← 动效层（与版式分离）
├── js/core/                    ← 纯逻辑，浏览器 / Node 共用，有测试
│   ├── ganzhi.js               干支表、十神、藏干加权、地支关系
│   ├── ai-providers.js         六家 provider 目录 + 请求构造 + SSE 解析
│   ├── bazi-engine.js          排盘事实（四柱/大运/流年流月/旺衰/格局）
│   ├── bazi-luck.js            红绿灯评分 + 神煞查法
│   ├── bazi-reading.js         八字文案（六宫格/特质/建议）
│   ├── yijing-data.js          八卦 + 六十四卦（卦辞原文 + 白话断 + 吉凶级）
│   ├── meihua.js               起卦（时间/数字/铜钱）+ 解卦（本互变/体用）
│   └── gua-reading.js          问事文案（体用 × 类别）
├── js/ui/                      ← 页面控制器与渲染
│   ├── almanac.js              首页今日黄历
│   ├── bazi-page.js            八字页流程（表单/分享/下载）
│   ├── bazi-render.js          命盘看板 HTML + 五行雷达 SVG
│   ├── qigua-page.js           起卦页流程（三种起卦 → 解卦）
│   ├── gua-render.js           卦象渲染（六爻图 + 断语）
│   ├── reveal.js               进场观察器 + 交错编号 + 数字滚动
│   ├── coin-cast.js            铜钱 Canvas 动画引擎（卦坛/粒子/音效，纯函数可测）
│   ├── coin-panel.js           蓄力交互 + 六爻塔 + 静音开关
│   ├── share.js                分享链接编码 + 单文件看板导出
│   └── ai.js                   AI 深读面板（provider 切换 + 流式渲染）
├── js/vendor/lunar.js          ← 6tail/lunar-javascript（MIT）
├── scripts/bump-version.sh     ← 刷新资源版本串（改完前端必跑）
└── tests/*.test.mjs            ← node:test，51 例
```

## 本地运行

```bash
node --test tests/*.test.mjs
```

```bash
python3 -m http.server 4600 --directory /Users/van/Documents/Agent-Workbench/claude/coding/mogua-web
```

或在 Claude Code 的浏览器面板里 `preview_start {name: "mogua-web"}`（已登记在 `claude/.claude/launch.json`）。

## 部署

零构建，把整个目录原样传上去即可（`.nojekyll` 已备好，供 GitHub Pages 跳过 Jekyll）。所有路径都是相对路径，放在子目录里也能跑。

> ⚠️ **改动 css/js 后必须 bump 版本串**，否则老访客拿到的是强缓存的旧文件（本项目已经因此排查过两轮假 bug）：
>
> ```bash
> ./scripts/bump-version.sh
> ```

| 平台 | 状态 |
|---|---|
| **GitHub Pages** | ✅ 已上线 https://vanbuster.github.io/mogua-web/ ，push 到 `main` 即自动更新 |
| 飞书妙搭 | ⏳ 待一次 user 授权（`lark-cli auth login --domain apps`，缺 `spark:app:write`），之后 `lark-cli apps +create --as user` → `apps +html-publish --path ./dist` |
| Vercel | ⏳ 待用户在网页导入 GitHub repo（零配置，framework 选 Other） |

发布给妙搭前先生成干净产物：

```bash
rsync -a --exclude='.git/' --exclude='dist/' --exclude='tests/' ./ dist/
```

## 已知边界

- 解读是规则引擎，覆盖面有限：格局只按月令本气定，不判从格 / 化格 / 调候；神煞只查七种常用
- 真太阳时未校正（skill 也未校正，只提醒）
- 六爻摇卦只用梅花体用法解，不排六亲 / 世应 / 六神；多爻动时体用取最上一动爻，页面会标注
- `bazi-skill/references/chart-calculation.md` §1.4 的示例算错了（2000-03-08 是乙丑日不是丙寅），本项目以 lunar-javascript 为准，测试里已固定这个用例

## 下游

- 补齐飞书妙搭与 Vercel 两个入口（各差用户一次授权，见上表）
- 若要给无 Key 的访客提供 AI 深读，需加一个带服务端密钥的代理（Fate-Ring 的 `api/deepseek` Vercel 函数是现成模式），Vercel 部署完就能直接加

## 许可

代码 MIT。`js/vendor/lunar.js` 版权归 6tail（MIT，见 `js/vendor/LICENSE-lunar-javascript`）。卦辞为《周易》公有领域文本。
