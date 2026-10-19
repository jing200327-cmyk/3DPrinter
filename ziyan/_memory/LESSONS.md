# 经验教训 (Lessons Learned)

> ID 前缀 `LL-`｜记录返工点与踩过的坑，让第 10 个需求比第 1 个做得更快

### LL-001 「入口按钮」的描述必须回到底图核对，不能只信代码里的 id
- **教训**：用户说"入口为模型详情页模型设置按钮"，但代码里 `#model-settings` 的文案是 **Settings**，而底图（`模型详情页.png` / `.jpg`）上写的是 **「打印设置」**。只看代码会做错入口文案。
- **应对**：凡涉及"某按钮/某入口"的描述，一律回到底图或截图确认实际文案。

### LL-002 `file://` 下浏览器禁止读取本地文件，STL 必须内嵌
- **教训**：Three.js 加载 `.stl` 需要 `fetch`/`XHR`，而 Chrome 在 `file://` 协议下会因 CORS 直接拒绝。若直接把 `.stl` 放同级目录，用户双击 HTML 会**白屏**。
- **应对**：把 STL **顶点聚类减面后 base64 内嵌**成 JS 资源。本次 79,916 面 → 35,751 面（0.88mm 单元），文件 559KB，尺寸仍精确还原（61.45 × 99.44 × 6.95 mm）。
- **工具**：`R001-模型编辑与切片/annex/stl_pack.py`（可复用）。

### LL-003 依赖一律本地化，CDN 只用来下载一次
- **教训**：本机 `github.com:443` 不通，但 `unpkg.com` / `cdn.jsdelivr.net` 通。原型要能离线双击打开，不能依赖 CDN。
- **应对**：`three@0.147.0`（UMD，608KB）与 Tailwind 浏览器版（407KB）都下载到 `prototype/vendor/`。
- **注意**：`npm install tailwindcss` 在本机会因 **cache trash 被安全策略拦截**而中断回滚，`node_modules/.bin` 是空的。改用 CDN 版 JS 本地化更稳。
- **注意**：three r148+ 移除了 `build/three.min.js`（UMD）与 `examples/js/`，**r147 是最后一个有 UMD 的版本**。

### LL-004 多 WebGLRenderer 共用同一 Scene 时，离屏读取必须开 `preserveDrawingBuffer`
- **教训**：`drawImage(canvas)` / `toDataURL()` 读另一个 renderer 的画布时，若没开 `preserveDrawingBuffer`，取到的是**全透明**（0 像素）。我因此误判"预览没渲染"，实际画面完全正常。
- **应对**：凡是需要截图/缩略图/像素断言的 renderer，一律 `preserveDrawingBuffer: true`。
- **另**：准备打印页的盘缩略图就是靠一个独立的 `thumbRenderer` 复用同一 Scene 渲染出来的。

### LL-005 `go(hash)` 里用 flag 抑制 `hashchange` 会吞掉导航
- **教训**：常见写法
  ```js
  routing = true; location.hash = target;
  setTimeout(() => routing = false, 0);   // ❌
  ```
  `hashchange` 任务排在 `setTimeout` 之前，回调里 `if (!routing)` 直接跳过 → **页面永远不切换**，而且不报错。
- **应对**：改成**按 hash 值幂等**：`applyHash(force)` 记住 `lastApplied`，`go()` 里设完 hash 后**立刻主动调用** `applyHash(true)`，事后到达的 `hashchange` 因值相同而自动跳过。

### LL-006 无头验证时，先分清"代码 bug"和"环境/方法 bug"
- **症状**：一批位于 `bind()` 中的监听器全部"失效"，而动态生成的盘号按钮正常 → 看起来像"事件没绑上"。
- **真因**：`initPreview()` 里一个未声明的变量（`previewCam` 漏在 var 列表外）抛 `ReferenceError`，**boot() 当场中断**，后面的 `bind()` 根本没执行。而 `requestAnimationFrame(renderLoop)` 也没启动 → 3D 画布全白。
- **应对**：写探针脚本，用 `Page.addScriptToEvaluateOnNewDocument` 注入 `window.addEventListener('error', ...)`，把真实异常抓出来再改——**不要靠猜**。

### LL-007 可交互原型的验证要覆盖"行为"而非"外观"
- **做法**：用 Node 22 内置 `WebSocket` 直连 Chrome CDP（**无需 puppeteer/playwright**），跑 97 项断言：状态机、边界条件、Toast 文案、DOM class、hash 路由，以及 canvas 的**非透明像素计数**（证明 3D 真的画出来了，而不是只看 `canvas.width > 0`）。
- **复用**：`R001-模型编辑与切片/prototype/_verify/verify.mjs`。
- **坑**：`--disable-gpu --enable-unsafe-swiftshader` 下 WebGL 可用（SwiftShader）；不要想当然认为无头环境没有 WebGL。

### LL-008 相机取景：抬高 `lookAt` 会让贴地模型"下沉"
- 模型平放在 z≈0，相机 target 的 z 抬高 → 模型在画面中**更低**。要让贴地模型上移，必须**降低** target 的 z。
- 本次最终方案：面板展开时 `el 34°→47°`、`dist 272→292`、`tz 40→-34`，把模型顶到面板上方的可视区。

### LL-009 复制失败回滚必须连布局一起还原
- **教训**：`doCopy` 里先 `pack()` 再校验，失败时只 `pop()` 掉新模型 → 原有模型的位置已被 `pack()` 改乱，可能出现越界/重叠。
- **应对**：**先快照所有位置**，失败时把列表和位置一起回滚。

### LL-010 换演示数据只换 state 不重建网格，会看到"上一屏的残留"
- **教训**：验证脚本里调用 `demo(n)` 只替换了 `state.plates`，网格仍是上一次 `buildPlateMeshes()` 的结果 —— 于是截图上出现了"2 个红色零件"，而 state 里明明只有 1 个。**看起来像产品 bug，其实是测试脚本的问题**。
- **应对**：调试句柄里补 `rebuild()`（`buildPlateMeshes(currentPlate()) + refreshEditorUI()`），凡是在测试中改数据后都要调用；产品侧"演示数据"按钮本来就是调 `buildPlateMeshes` 的，没有这个 bug。
- **通用规律**：3D 场景是**显式重建**的（不是响应式），任何直接改 state 的测试代码都必须手动触发重建，否则看到的是陈旧渲染。
- **🔁 已二次踩中（R002，2026-09-29）**：需求要求"编辑页空态保留 3D 展示区"，把空态层改成透明后，**3D 里赫然还显示着上一次导入的模型**——因为 `setTaskEmpty(true)` 只清 `state.plates`、没调 `buildPlateMeshes()`。
  **对策固化**：凡是有"清空 / 切换内容"的入口，函数末尾必须**无条件**走一次 `buildPlateMeshes(currentPlate() || null)`，不要用 `if (plates.length)` 这类条件把重建跳过去。

### LL-011 相机距离做了逐帧插值后，任何"直接改距离"的入口都必须同步动画目标
- **教训**：加了 `stepOrbit()` 每帧把 `orbit.dist` 朝 `orbitGoal.dist` 插值之后，滚轮缩放只改了 `orbit.dist`，于是**0.3 秒内被插值拉回原位**——用户反馈"无法放大缩小"。捏合缩放当时同步了 goal 所以没暴露。
- **应对**：把所有的缩放入口统一收敛到一个 `zoomBy(k)` 函数里，在函数内部同时改 `orbit.dist` 和 `orbitGoal.dist`；用户拖动/捏合后同样要把 goal 同步过去。**只要引入了"朝目标插值"，就要审查所有写入该字段的地方。**
- **另**：桌面端别只提供双指捏合，必须有滚轮 + 可见的 ＋/−/复位按钮兜底。

### LL-012 hash 路由：同文档导航（只改 hash）**不会重载页面**，状态会跨深链残留
- **教训**：R002 验证脚本用 `Page.navigate` 依次打开 `#offline-expired` → `#system-picker`，以为每次都是"新页面"，实际只改 hash → **不重载**，上一条深链设的 `state.importMode='offline'` 被带进了普通文件目录，于是"全选 12 项"只选到 2 个 gcode 文件，我一度怀疑是全选按钮坏了。
- **应对（两层）**：
  1. **产品侧**：别名分支里对语义相反的模式做**显式复位**——`#system-picker` 明确设为 normal，`#offline-*` 明确设为 offline，不依赖"上一次的值"。
  2. **测试侧**：每条深链加 `?n=<nonce>` 查询串**强制整页重载**，保证深链在全新状态上验证。
- **通用规律**：凡是用 hash 表达"模式"的单页原型，都要给每个锚点写全它自己的状态，别让锚点之间"继承"状态。

### LL-013 程序化 `go()` 会被 `applyHash` 的重置逻辑回冲
- **教训**：`retryFailedFiles()` 里先 `state.pickerSelected = names` 再 `go('system-picker')`，结果 `applyHash` 内部又调了一次 `openPicker()`，把刚回填的勾选态清空了。同类问题在 R002 出现两次（另一次是 `openPicker()` 内部 `go()` 把 offline 模式冲成 normal）。
- **应对**：**先切屏、再写数据**；或让 `openPicker(mode, navigate=false)` 支持"只渲染不导航"。凡是"设状态 → 触发路由"的顺序，都要假设路由回调会重置同类状态。
- **更根本的**：路由回调里的 `resetXXX()` 要有明确边界，别把"入口参数"和"页面状态"混在一个对象里。

### LL-014 校验顺序 = 用户体验：顺序错了，功能等于不存在
- **教训**：R002 初版 `confirmPicker()` 先判"批量总量 ≤ 300MB"再逐个校验单文件。结果全选 12 个文件时，两个超 100MB 的大文件**先被总量闸门丢掉**，用户**永远看不到「可自动压缩到 100MB 以下导入」这条路**——而这个功能正是需求文档 §3 的重点。
- **应对**：顺序必须是 **格式 → 单文件体积（→ 触发压缩）→ 面数 → 批量总量**。批量闸门要放在"用户已经对每个文件做完决定"之后，只负责收尾。
- **通用规律**：多个校验条件串联时，**把"能给出路的条件"（可压缩/可重试）排在"直接拒绝的条件"（超总量）前面**。

### LL-015 Mermaid 的 `useMaxWidth` 会把宽图压成"细高条"
- **教训**：默认 `useMaxWidth: true` 让 SVG 撑满容器宽度，跨列很宽的流程图被压成 1588×5015 的细高条，节点文字全都挤成一团。
- **应对**：`flowchart: { useMaxWidth: false }` + 容器 `overflow-x: auto`，再按 **SVG 自身自然尺寸**（`svg.getBoundingClientRect()`）截图，图立刻变成 1066×3412 的正常比例。
- **另**：Mermaid 的**回流边（back-edge）会把图拉得很长**。长回路（"返回上一页""写回另一页"）不要画成边，改成末端一个"回流与复用"说明节点，图会紧凑很多。

### LL-016 无头截图必须固定视口，`--window-size` 不够
- **教训**：`--window-size=430,900` 时截图上手机底部被裁掉——`.stage` 有 `padding: 40px 24px 64px`，812px 手机 + 上下留白 ≈ 916px，超出视口高度。
- **应对**：启动后调 `Emulation.setDeviceMetricsOverride({ width, height, deviceScaleFactor: 2, mobile: true })`，视口和缩放都显式指定；截图顺带 2x 更清晰。不要依赖命令行窗口尺寸。

### LL-017 类的 `display` 会压过 `[hidden]`，`hidden` 属性不等于「真的不渲染」
- **教训**：分享页用 `[hidden]` 在「设备卡」和「空态卡」之间切换，但两张卡都写了 `display: flex`。作者样式（`.share-device { display: flex }`）**特异性高于 UA 样式表的 `[hidden] { display: none }`**，于是进入「无可分享设备」时**两张卡同时渲染**、页面凭空高了 100px。
- **更坑的是**：DOM 断言 `element.hidden === true` 完全正常，单看 `hidden` 属性永远查不出来；只有截图或量高度才会发现。
- **应对**：在该模块作用域里补一条兜底规则 `.share-screen [hidden], .member-screen [hidden] { display: none; }`；e2e 同时断言 `hidden` 属性和 `getComputedStyle(...).display`。
- **通用规律**：任何「用 `hidden` 切换」的元素，只要自己写了 `display`，就必须配一条 `[hidden]` 覆盖规则；验证时要断言**计算样式**，不能只断言属性。

### LL-018 含中文的 PowerShell 脚本必须 UTF-8 BOM + CRLF，并加一条编码自检
- **教训**：给 `tests/prototype-contract.ps1` 追加中文断言时，PS 5.1 读「无 BOM 的 UTF-8」会按 GBK 解码，中文字面量整个乱掉。症状极其隐蔽：`$html.Contains('分享打印机')` 恒为 `false`，**契约断言不会报错，只会静默失效**，看起来像「实现没写」。
- **应对**：
  1. 用 Python 重写文件时显式补 `b'\xef\xbb\xbf'` 并把换行统一成 CRLF；
  2. **在追加块开头加一条自检** —— `if ('分享打印机'.Length -ne 5) { throw '...' }`，编码一坏就在这条上炸出来，而不是让下面几十条断言悄悄变成 `false`。
- **另**：`System.Drawing` 里 32 位带透明通道的格式串是 `Format32bppArgb`，**不含 "Alpha" 字样**；`-notlike '*Alpha*'` 会误判。判据要写成 `-notmatch 'Argb|Alpha'`。
- **再另**：PowerShell 工具执行时 stdout 可能不回传，**把断言结果或退出码写进文件再读**，别靠控制台输出判断成败。

### LL-019 父层 `pointer-events: none` 会连带子元素失效；**程序化 `click()` 抓不到「点不动」**
- **教训**：R002 空态为了让"透明覆盖层不挡住 3D 拖动"，给 `.ed-empty` 设了 `pointer-events: none`，**但漏写了子按钮恢复 `auto` 的那一行**——一次 Edit 的 `old_string` 只圈到 `.ed-empty__cube`，把后面的 `__title` / `__desc` / `.btn-primary` 规则**整段静默丢了**。
  结果：按钮**看得见、有 hover 反馈、程序化 `el.click()` 也能触发**，但**真实鼠标点击直接穿透到 canvas**，用户完全点不动；而当时的自动化断言用的是 `document.querySelector('#btnEmptyImport').click()`，**全部通过**——测试给了假绿灯。
- **应对（两层）**：
  1. **产品侧**：任何"父层 `pointer-events: none`"的写法，必须在紧邻位置写下子元素恢复规则并注释原因；能用 `z-index` 分层解决就别用 `pointer-events`。
  2. **测试侧**：给关键按钮补 `realClick()`——**先 `document.elementFromPoint(中心点)` 做命中测试**（必须落在目标或其子节点上），再用 `Input.dispatchMouseEvent` 派发 mousePressed / mouseReleased。程序化 `.click()` 只能验证"事件处理逻辑对不对"，**验证不了"用户点不点得到"**。
- **通用规律**：**"逻辑正确"与"可交互"是两件事**。凡是依赖命中测试的样式（`pointer-events` / `z-index` / 覆盖层 / `overflow`），都必须用真实坐标点击回归。
- **另一条**：**用 Edit 改样式块时，`old_string` 要把整块选择器一起圈进去**。只圈到中间某个选择器，改完会静默丢掉它后面的规则——本次 bug 就是这么产生的。

### LL-020 CSS 选择器写成 id、但元素 id 其实是另一套名字 → 规则静默失效
- **教训**：起始页改写按钮时，元素写成 `<button id="start-cta-auth" class="start-cta-pill">`，CSS 却写了 `#start-cta-pill { left: 25.656%; … }`。浏览器里**id 选择器一个都匹配不上**，而同名 `.start-cta-pill` 类的规则照常生效 —— 于是出现「元素存在、颜色/字号都对、就是位置和尺寸完全不对」的怪状，看起来像布局 bug，实际是选择器笔误。
- **应对**：给「几何覆盖规则」写选择器时，**优先用类名**（类名和元素绑定更直观），并在注释里写明量取到的原图像素坐标；e2e 用 `getBoundingClientRect()` 断言位置/尺寸，而不是只看「渲染出来像不像」。
- **自查**：`document.querySelector(选择器)` 返回 null 就说明选择器写错了；发布前跑一遍 `document.querySelectorAll('选择器')` 空集合检查。

### LL-021 在既有函数里调用「后追加模块」的 `const`：TDZ 报错
- **教训**：把新功能模块追加到脚本末尾，又在前面的 `showScreen()` 里加了对模块函数的调用 —— 原有的 `?screen=xxx` 深链初始化在模块之前执行，这时模块的 `const xxx = document.querySelector(...)` 还在 TDZ 里，直接抛 `Cannot access 'demoChip' before initialization`，**整页所有交互都失效**，而且只在带 `?screen=` 参数时出现（默认打开反而不报），极易漏测。
- **应对**：
  1. 把深链/初始化块**挪到追加模块之后**（用脚本按标记切分重排，别手工剪切）；
  2. 再加一条 `var joinModuleReady = false;`（**必须是 `var`**，`let/const` 同样有 TDZ）作为就绪标记，函数的第一行 `if (!joinModuleReady) return;`，这样即使将来顺序又变了也只是静默跳过，不会整页崩。
- **通用规律**：往既有脚本「追加模块 + 改既有函数」时，一定要核对**初始化执行顺序**，并且用 `?参数=` 深链各跑一遍。

### LL-022 `object-fit: cover` 的整图页，覆盖层要对齐「真实绘制的图片矩形」而不是元素盒子
- **教训**：起始页用 `min-height: 100vh` + `object-fit: cover` 铺满视口，元素盒子会随视口高度变化，而既有热区用的是**盒子百分比** —— 这本身就是隐患。给这类页面加覆盖层（改文字/盖住某块）时，如果也用盒子百分比，视口高度一变就偏。
- **应对**：JS 算 `scale = max(box.w / IMG_W, box.h / IMG_H)`，把覆盖层设成 `IMG_W*scale × IMG_H*scale`，并按 `object-position`（本项目是 `top center`）平移到绘制原点；子元素继续用**图片内百分比**。缩放因子用 `--img-scale` 传下去给 `font-size: calc(30px * var(--img-scale))` 这类尺寸用，文字才能跟着图片一起缩放。
- **验证**：断言覆盖层矩形 == 绘制矩形（`overlay.width === image.width` 且 `overlay.height === image.height`），并把覆盖层坐标反算回原图像素，对照量取值（偏差 ≤1px）。

### LL-023 发布脚本重跑会被 `rmtree` 拦住，改成覆盖写
- **教训**：构建发布目录时用 `shutil.rmtree(OUT)` 先清空，结果被安全删除策略拦（`[safe-delete] windows-sandbox-recycle-bin-unavailable`），脚本直接崩在第一步。
- **应对**：不做整目录删除，改为 `os.makedirs(OUT, exist_ok=True)` + `copy2` 覆盖写（同名文件会被覆盖，多余的旧文件用 `find` 手动确认后删）。
- **另**：扫描引用时要**过滤掉「目录名」这类伪引用**（JS 里常把 `'../../src/dayinji'` 这种目录前缀单独存成字符串再拼文件名），判据是「basename 带扩展名且扩展名长度 1~6」，否则会把目录当文件复制并抛 `PermissionError`。
- **再另**：发布后校验断言 `location.href` 时，站点返回的是**百分号编码**的 URL（中文路径变成 `%E6%89%93…`），`href.includes('打印机首次配网连接流程原型')` 会**误报失败**。断言前必须 `decodeURI(location.href)`。

### LL-024 图文并茂流程图 = HTML 直绘，不是 Mermaid
- **教训**：想用 Mermaid 做"节点里嵌真实原型截图"的流程图，发现 Mermaid 节点不支持本地图片（HTML 标签在 mermaid 节点里要么不渲染，要么要走 `fa:fa-icon` 这种内置库，对截图没用）。
- **应对**：直接 HTML + 内联 SVG 箭头 + `<img class="node__shot" src="...">` 节点 + `.branch-row` 异常分支带虚线分隔。结构是 `Row 1（主路径节点）→ 向下箭头 → Row 2（后续节点）→ .branch-row（异常分支并列）`。
- **关键技巧**：
  - 占位节点（无真实截图）用专门类 `.node__placeholder`，**不要**复用了 `.node__shot` 类的 `<div>`——CSS 类的属性（`object-fit: cover` 等）会与 inline style 冲突导致塌陷。
  - 箭头用 `<svg class="ar" viewBox="0 0 28 156"><line/><polyline/></svg>`，高度跟图片框同高（节点高度 + 标题 + 描述 ≈ 156px），箭头垂直居中靠 `margin-top` 微调。
  - 截图加载完成再截图：`document.querySelectorAll('img').forEach(im => im.complete && im.naturalWidth > 0)` 全 OK 后再 `Page.captureScreenshot`，否则部分图会渲染成空框。
- **配套**：Mermaid 源（`.mmd`）保留简化版（去掉 # 锚点 + 实现细节描述），便于贴到飞书/语雀/Markdown 渲染；Mermaid 版作为"快速理解"，HTML 版作为"交付评审"。

### LL-025 深链截图三大坑（每次补图都要先看）
- **坑 1：ROOT 路径错位**。`shoot-bindings.mjs` 起步时把 `ROOT = path.resolve(__d, '..')` 但 `__d` 是 `_verify/`，所以 ROOT 其实是 `prototype/`，URL 应是 `http://.../prototype_v1.0.html`。之前看 check.mjs 知道它写的是 `prototype_v1.0.html`，但我没核对 ROOT 实际值，把 URL 写成了 `/prototype/prototype_v1.0.html`（多一层），结果整页 404，所有截图都是空白白纸带个 404 字。
- **坑 2：缺 nonce，同文档导航状态残留**。原型用 `hashchange` + `applyHash()` 路由，连续 `Page.navigate` 到 `#hash1` → `#hash2` 时是同文档导航，state 没重置。check.mjs 第 117 行注释明说"带 nonce 查询串强制整页重载，保证每条深链都在全新状态上验证"。**截图脚本**也必须 `?n=${i}` 强制 reload。
- **坑 3：首次加载 vendor 慢**。原型加载 `vendor/three.min.js` + `mermaid.min.js` + `assets/model.js` 全部跑起来要 3~5 秒。check.mjs 跑过 127 项全绿是因为它在前面已 warm 过多次；新脚本冷启动 sleep 900ms 不够，弹窗 hash 没生效。第一遍 sleep 3500ms + 预热 1 次（warm=1）才稳。
- **预防套路**：任何"按深链截图"的脚本都必须 ①确认 ROOT；②加 nonce；③先 warm 一次再 sleep 足够（首次 4~5s，后续 1.5~2s）；④读弹窗标题验证 hash 生效再截图，否则存了图也不知道是错的。
- **坑 4（2026-10-08 补）：RESET 片段是 IIFE 时结尾必须带分号**。`const RESET = \`(() => {...})()\``（无分号）拼进 `\`${RESET} __R002.go(...)\`` 后变成 `(() => {...})() __R002.go(...)` → `SyntaxError: Unexpected identifier`。且 `q()` 最初把 exceptionDetails 静默吞掉，表现为"截图全部冻结在同一帧"，极难定位。**套路：给 evaluate 包装一律打印 exceptionDetails；IIFE 字符串模板结尾永远补 `;`**。连续多张截图体积完全相同 = 画面冻结的强信号。

### LL-026 外部资源路径由 JS 拼串 → 打包/发布脚本扫不到，线上直接缺图
- **教训**：老实现里进料页图片是 `filamentOperationImage.src = \`${filamentAssetRoot}/${'进料中'}.png\``，而 `filamentAssetRoot` 是**目录常量**。发布脚本（只收 `src/href`、CSS `url()`、带扩展名的 JS 字符串）把目录当伪引用过滤掉了 → 资源没被拷进发布目录 → 线上点「进料」一片空白，本地却完全正常（本地 `../../` 直接指向源目录）。
- **应对**：① 能被静态扫描的资源引用**写在 HTML/CSS 里**（`<img src="...">`），需要动态切图时用「完整相对路径」而不是「目录 + 文件名」拼串；② 发布后必须**在真实浏览器里**跑一遍「资源 `naturalWidth > 0`」的断言（`tests/check-online-filament.mjs`），只查 HTTP 200 不够——图片 404 在页面上可能只是空白，不会报错。

### LL-027 `.foo { display: flex }` 会压过 UA 的 `[hidden] { display: none }`
- **教训**：新页面根节点写了 `.fo-screen { display: flex }`，而它初始带 `hidden` 属性。**作者样式表的 display 覆盖了 UA 的 `[hidden]` 规则**，页面在未进入时就一直盖在打印页上面。诡异之处：`screen.hidden === true` 依然成立，只查 `hidden` 属性的断言查不出来；只有 `getComputedStyle(...).display`、`offsetParent` 或 `elementFromPoint` 才暴露。表现是「别的页面的按钮点不动」——命中测试落在这一层上。分享页当初踩过同一个坑（`.share-device`），这是第二次。
- **应对**：任何给根节点写了 `display` 的浮层，都必须补一条 `[hidden]` 兜底（`.foo[hidden] { display: none; }`），并在 e2e 里断言 `display === 'none' && !offsetParent && elementFromPoint(中心点) !== 该层`。
- **定位技巧**：`document.elementFromPoint(x, y)` 直接告诉你是谁挡住的，比逐个 `getBoundingClientRect` 快得多。

### LL-028 网关按 `Accept-Encoding` 分片缓存：curl 查是新的、浏览器拿到的是旧的
- **教训**：重新部署后线上报 `TypeError: Cannot read properties of null (reading 'addEventListener')`（新 HTML + 旧 JS）。curl 怎么查都是新内容，但用 Chrome 的 `Accept-Encoding: gzip, deflate, br, zstd` 请求，返回的是 `Age: 5197` 的旧分片（同 URL 在 CDN 里按编码存了多份，重新部署只刷新了一部分）。更坑的是：带 `Cache-Control: no-cache` 的请求反而可能命中**另一个**旧分片（无头脚本开 `Network.setCacheDisabled` 会因此报假失败）。
- **应对**：① 所有静态资源带 `?v=xxx` 版本查询串，改文件就抬版本号（新 URL = 冷缓存），并写进契约测试强制校验；② 排查用 `curl -H "Accept-Encoding: gzip, deflate, br, zstd" -D - -o /dev/null <url>` 看 `Age` / `Eo-Cache-Status`；③ 无头验证脚本**不要**开 `Network.setCacheDisabled`，按真实浏览器路径验证；④ 刷不掉就换一个新沙箱（冷缓存）当对外地址。

### LL-029 一个状态标志同时管多个入口 → 改 A 顺手把 B 弄坏了
- **教训**：固件用单个 `firmwarePending` 同时控制「首页提醒条显隐」「设置页橙色文案」「固件版本行落哪一页」。顶栏齿轮的点击处理为了表达「以普通身份看设置页」调了 `setFirmwarePending(false)`，于是**只想影响后两项，却把第一项首页提醒条一起收掉了**——用户点一次齿轮、什么都不做就返回，首页的「新的固件版本可用，立即升级」就没了（刷新才回来）。表现上非常像「入口被删除了」，排查时容易往「谁删了 DOM」的方向找，实际是**状态耦合**。
- **应对**：一个标志只表达一件事。按「**事实** vs「**本次的展示上下文**」拆开：事实（`xxxAvailable`）只被业务事件改（升级完成），上下文（`xxxSettingsContext`）只被入口改。控制 UI 时用 `事实 && 上下文` 显式组合，别用同一个变量兼职。
- **回归断言的位置**：这类 bug 的触发顺序和主流程相反——主流程是「先走完升级（事实已变 false）→ 再点齿轮」，恰好掩盖问题；**必须单独写一条「初始态（事实为 true）时点齿轮 → 返回 → 断言入口还在」**。写完要把 bug 临时放回去跑一遍，确认断言真的会红（本轮实测：断言捕获到 `{"hidden":true,"display":"none"}` 并让 e2e 退出码变 1）。

### LL-030 网关把入口 HTML 也缓存住时，抬 `?v=` 是无效操作
- **教训**：上一轮学到「子资源会被网关按 `Accept-Encoding` 分片缓存，改用 `?v=` 版本串击穿」。本轮照做（r005 → r006）后重新部署，线上**仍然是旧版**：`curl` 看 `Eo-Cache-Status: HIT`，两种编码变体返回的 `index.html` 里都还是 `?v=r005`。因为这次被缓存的是 **HTML 本身**——HTML 旧，里面引用的自然还是旧版本串，`?v=` 的价值被架空。
- **应对**：① 判断「线上是否真的更新了」要做**内容级断言**（`typeof setFirmwareSettingsHasUpdate === 'function'` 这类），不能只看 HTTP 200；② 发现是 HTML 被缓存就**换冷缓存沙箱**（复制发布目录为新目录再部署），别在同沙箱反复重试；③ 交付前把这条内容级断言脚本固化成 `tests/check-online-firmware.mjs` 并随站点地址一起交付。

### LL-031 无头 Chrome profile 复用 + 静态服务无缓存头 → 「改了没生效」假象
- **教训**：check.mjs 的本地静态服务对 prototype.js 没加 Cache-Control，headless Chrome 的 profile 目录复用时命中**强缓存条目**，跑的是旧版 JS——改了管线、重跑断言，失败模式却完全不变（且与另一个新 profile 的调试脚本观察**互相矛盾**：同一渲染函数一处按原始序一处按分组序）。排查时极易误判成「逻辑 bug」。
- **应对**：① 本地测试服务一律加 `Cache-Control: no-store`；② profile 目录带时间戳（`chrome-profile-${Date.now()}`），每跑一次全新；③ 两个观察矛盾时**先怀疑环境不一致（缓存/profile），再怀疑逻辑**。
- **另**：沙箱对 `rm -rf` 超过 50 个文件的批量删除要求授权（SAFE_DELETE_BULK_CONFIRM_REQUIRED），整个命令会直接失败——清理 profile 别和跑测试写在同一条命令里。

---

## LL-032 无头校验线上脚本的 URL 必须是「站点根」，不能带深链

- **踩坑**：`check-online-v11.mjs` 内部会自己拼 `${base}/prototype/prototype_v1.1.html?n=N${hash}`。
  如果传进去的 `base` 已经带了 `#import-sheet/slice` 这类深链，拼出来就是
  `.../prototype_v1.1.html#import-sheet/slice/prototype/prototype_v1.1.html?n=3#system-picker`
  —— hash 后面又跟了路径，页面停在错误状态，后续 `document.querySelector(...)` 全部拿到 null，
  表现为「莫名其妙 null.textContent 报错」，很容易误判成页面 bug。
- **正确用法**：`node check-online-v11.mjs https://<sandbox>.app.workbuddy.host`（**只给站点根，不带 hash、不带页面路径**）。
- **排查口诀**：线上脚本报「元素为 null」时，先把实际拼出的 URL 打印出来看 hash 有没有带脏东西，再怀疑页面。
- **关联**：R002 v1.1.4 校验（BR-064）

---

## LL-033 `_memory/` 下的档案文件会被外部进程回退，写完要立刻回读校验

- **现象**：2026-10-15 上午追加 `BR-064` / `DEC-075` 后成功，但约 40 分钟后 `RULES.md`、`DECISIONS.md`、`REGISTRY.md`
  被回退到 18:20 的旧内容（本轮新增条目全部消失）；同批写入的 `SITEMAP.md`、`GLOSSARY.md`、`LESSONS.md` 却存活。
  三份被回退文件的 mtime 都是同一时刻 → 是**整体覆盖写**，不是内容冲突。
- **为什么会误判**：紧随其后的写操作（如继续往 `RULES.md` 追加 v1.1.5 内容）会成功，
  于是「上一轮写入丢失」这件事被完全掩盖，直到 grep 才发现条目不见了。
- **应对**：
  1. 每次写 `_memory/*.md` 后**必须 `grep` 回读关键 ID**（如 `grep -c 'BR-064' RULES.md`），不要凭 `cat >>` 的退出码判断成功。
  2. 改动前先 `cp xxx.md xxx.md.pre-restore` 留一份，便于对比丢了什么。
  3. 发现被回退后**重新追加**（内容在会话上下文里，不需要重写分析），并把 mtime 对齐检查一遍其他档案。
- **关联**：LL-006（本地与发布副本不一致时先 diff 再定位，同源问题）
