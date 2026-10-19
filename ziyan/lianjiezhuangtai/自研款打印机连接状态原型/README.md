# 自研款打印机连接状态原型

本原型根据 `../自研款打印机连接状态.md` 实现打印机设备页的三种连接状态，可直接离线打开。

## 页面入口

- `idle.html`：空闲完整页面
- `connecting.html`：连接中完整页面
- `offline.html`：离线完整页面
- `index.html?state=idle|connecting|offline`：共享实现与桌面状态切换预览

## 状态规则

| 状态 | 打印机状态 | 延时摄影 | 打印任务区 |
| --- | --- | --- | --- |
| 空闲 | 绿色“空闲” | 复用空闲实时画面 | 显示完整“准备打印”任务面板 |
| 连接中 | 黄色旋转“连接中...” | 复用连接中加载画面 | 仅显示黄色“待连接”状态条 |
| 离线 | 灰色“离线” | 复用连接中加载画面 | 仅显示灰色“待重连”状态条 |

三种状态均保留相同的耗材、控制与底部导航区域，并直接复用 `../../src/dayinji/底部导航栏.png`。空闲状态下，“探索玩具”和“我的模型”分别打开对应的完整参考页，可通过底部“设备”返回。

点击耗材区“设置”后，会从页面底部弹出仅含 4 个耗材槽位的设置页，不显示左侧独立料架。点击“进料”或“退料”会在当前原型内打开对应操作页；右上关闭和底部取消均直接覆盖参考图中的原按钮位置，点击后返回设备页，并分别提示“已取消进料”或“已取消退料”。

## 验证

```powershell
& '.\tests\prototype-contract.ps1'
node '.\tests\browser-e2e.mjs'
```

浏览器验收图包括三种状态页、`prototype-filament-sheet.png`、`prototype-explore-toys.png`、`prototype-my-models.png`、`prototype-feeding.png` 和 `prototype-retracting.png`。
