# 女孩打印旅程 HTML 原型（v3）

这是从 `dayinlvchengv2/打印旅程原型` 完整复制后形成的独立多账号任务流程。双击 `index.html` 即可离线预览，推荐使用 390 × 844 的移动端视口。

## 流程

1. 首页复用既有模型详情页与 `Settings` / `Create it` 入口。
2. `Choose your builder` 只展示女孩新增的两个待打印任务，分别复用 `src/dayinjirenwukongzhi/女孩的打印任务_1.jpg` 和 `女孩的打印任务_2.jpg`；卡片可点击选择，也支持横向拖动。
3. 页面顶部始终显示“打印机正在打印”，明确当前是在已有打印进行时新增任务。
4. `Choose your color` 会同步保留选中的女孩任务图片，可配置 `Food Box` / `Food Tray` 与 `pick your color` 的槽位；每张卡的最近一次配置会保存到本机。
5. 从首页进入的新增任务流程底部动作为 `Add it`。上传演示结束后返回打印机页并携带 `family=multi`，打印机进入打印中且队列呈现 2 个男孩任务与 2 个女孩任务。
6. 从女孩任务队列进入时，直接打开该任务的 `Choose your color`；打印中保留“打印机正在打印”提示并将 `Create it` 设为不可用，打印完成态隐藏提示且允许 `Create it`。完成态点击 `Create it` 后，所选女孩任务会成为打印机页的当前打印模型并从队列移除。左上返回会直接回到打印机页，不会经过 builder 页，并保留当前打印任务、完成集合和剩余队列。

## 文件

- `index.html`：女孩 builder、配色页与上传状态结构
- `styles.css`：复用 v2 的移动端布局、横向卡片与耗材选择样式
- `prototype.js`：女孩任务选择、耗材配置持久化、`Add it` 和打印机回退逻辑
- `tests/prototype-contract.ps1`：女孩任务素材、标题、提示与路由结构契约
- `tests/browser-e2e.mjs`：Builder → Color → Add it → 四任务多账号队列端到端验证

## 验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\prototype-contract.ps1
node .\tests\browser-e2e.mjs
```
