# 自研款打印机打印旅程 v2 HTML 原型

双击 `index.html` 即可离线预览，无需安装依赖或启动服务。推荐使用 390 × 844 的移动端视口。

## 完整旅程

1. 起始页提供同样式的 `Settings` 和 `Create it` 双按钮：390 px 视口下均为 172 × 52 px、8 px 圆角、蓝紫底白字，水平间距 25 px；整体在上一版基础上再上移 2 px。两个入口均进入选盘页，320 px 视口自动压缩宽度避免裁切。
2. 第一页标题为 `Choose your builder`。盘 1/2/3 取消卡片容器，以无底色的大模型图自上而下排列并水平居中，仍可直接点击选择。盘 2/3 的素材留白会在显示时放大，确保模型、标题、时长和耗材文字可读；页面不再显示当前排序及上移/下移控制。底部 `Choose your color` 进入第二页。
3. 第二页标题为 `Choose  your  color`，保留所选盘图片；耗材来源显示为 `Food Box` 和 `Food Tray`，仓内耗材入口显示 `pick your color`。
4. `Food Box` 模式可打开原仓内耗材图片，弹出页可见标题为 `pick your color`；可选择 1、2、4 号仓并回填颜色，3 号空仓禁用；`Food Tray` 模式禁用仓内选择。
5. 底部 `Start Creating` 显示 2 秒上传进度，随后携带所选盘位和 `source=journey-v2` 进入自研款打印机页面；首次任务使用 `status=preparing`，先显示 30 秒“准备中”；页面存在任一“已打印” builder 时，后续未打印盘使用 `status=printing`，直接进入打印中。
6. 打印完成后，从“下一盘”或任一待打印队列任务返回时统一进入 v2；所有已完成盘均显示“已打印”标签，已打印卡片不可重复选择，必须选择尚未打印的盘后才能进入 `Choose your color`。
7. `completed` 参数保存累计完成盘集合并在 v2 与打印机页面间持续传递；开始下一盘后，打印机队列会排除当前盘和全部已完成盘，直至三盘全部完成。
8. 点击打印队列中的待打印任务时跳过 builder 页，直接打开该任务盘的 `Choose your color`；例如队列盘 2 直接复用 `选择要打印的盘2（修改）.jpg`。配色页仍可切换 `Food Box` / `Food Tray`、选择仓位颜色，打印中仅 `Start Creating` 禁用。
9. 队列入口同时保留当前打印盘与待打印目标盘；其配色页左上返回一步回到当前打印机页面。由 `Choose your builder` 正常进入配色页时，返回仍回 builder，不改变其他入口层级。
10. 每个 builder 分别在本机保存最近一次耗材配置：来源只接受 `Food Box` / `Food Tray`，仓位只接受有效的 1、2、4 号槽；再次进入同一 builder 的配色页时自动恢复来源、仓位和颜色。

v2 已删除打印份数、打印校准、延时摄影和零件选择区。原 `dayinlvcheng` 打印准备页及打印机页面既有业务交互保持不变；打印机页面仅根据来源参数选择返回 v1 或 v2。

## 文件

- `index.html`：模型详情与两步打印准备页结构
- `styles.css`：起始按钮、大图盘位、耗材页、弹窗及状态标签样式
- `prototype.js`：两步导航、盘位与耗材选择、上传和跨原型状态交互
- `prototype-v2-create.png`：起始页按钮验收图
- `prototype-v2-build.png`：三个纵向居中的大模型、选择边框验收图
- `prototype-v2-color.png`：耗材匹配页验收图
- `prototype-v2-picker.png`：`pick your color` 弹出页验收图
- `prototype-v2-printing.png`、`prototype-v2-completed.png`：任务状态返回验收图
- `prototype-v2-printing-color-locked.png`：打印中允许配色但禁用 `Start Creating` 的验收图
- `prototype-v2-one-pending.png`：完成盘 2、开始盘 1 后展开队列仅显示盘 3 图片的单任务验收图
- `prototype-v2-all-completed.png`：三盘全部完成后的本地文件入口验收图
- `tests/prototype-contract.ps1`：需求结构契约测试
- `tests/browser-e2e.mjs`：隔离式 Chrome 跨原型全旅程测试

## 验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\prototype-contract.ps1
node .\tests\browser-e2e.mjs
```

浏览器测试覆盖起始按钮的文本、尺寸、位置与样式，两步页面切换，三个纵向居中大模型的选择，耗材来源和仓位规则，首次任务准备中、已完成盘后的续打直达打印中、队列任务直达对应配色页、左上角一步返回打印页、打印中仅禁用启动按钮、builder 级 Box/Tray 与仓位持久化、累计已打印标签、递减队列、最终本地文件入口，以及 320–1440 px 响应式布局、按钮可访问名称和浏览器错误。
