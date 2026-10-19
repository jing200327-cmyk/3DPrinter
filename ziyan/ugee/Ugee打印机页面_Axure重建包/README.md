# Ugee 打印机页面 HTML 原型

双击 `index.html` 即可离线预览，无需安装依赖或启动服务。推荐使用 390 × 844 的移动端视口。

## 已实现

- 顶部打印机状态、切换打印机和设置区域直接使用 Ugee 原图，视觉不改动，并保留可点击热区。
- 延时摄影使用 Ugee 原图中的同尺寸、同圆角画面作为占位。
- 打印模型、名称、规格、剩余时间、进度、暂停和取消合并到单一任务面板。
- “打印队列”位于任务面板内，可展开和收起待打印任务。
- 进料、退料与暂停、取消延续 Ugee 的图标布局和按钮样式。
- 控制菜单包含舱内灯、舱外灯、风扇和提示音；默认显示三项，可触摸或鼠标左右拖动查看第四项。
- 控制开关、暂停、取消、进退料、打印机切换和设置均有原型反馈。
- 固定保留 Ugee 底部主导航。

## 文件

- `index.html`：原型入口与语义结构
- `styles.css`：视觉和响应式布局
- `prototype.js`：队列、任务操作、拖动菜单和开关交互
- `assets/`：原始 Ugee 页面图片
- `prototype-preview.png`：390px 宽浏览器验收预览
- `AXURE-重建说明.md`：Axure RP 分层和动态面板重建规格
- `tests/`：结构契约与真实 Chrome 交互测试

## 验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\prototype-contract.ps1
node .\tests\browser-e2e.mjs
```

浏览器测试会验证队列展开、暂停状态、控制开关、轮播分页和浏览器错误，并刷新 `prototype-preview.png`。
