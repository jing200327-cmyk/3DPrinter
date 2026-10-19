# 页面与原型锚点 (Sitemap)

> ID 前缀 `SM-`｜**新增页面前必须先查这张表**
> 命中已有页面就复用锚点、扩展交互，不要另造一个功能重复的页面

## 一、既有页面（本次需求的上下游，复用为主）

| ID | 页面名 | 锚点 | 所属需求 | 原型文件 | 状态 |
|----|--------|------|----------|---------|------|
| SM-001 | 模型详情页 | `#screen-model` | 历史（打印旅程） | `dayinlvchengv3/index.html` | 现行 |
| SM-002 | 选择打印盘（Choose your builder） | `#screen-settings` | 历史（打印旅程） | `dayinlvchengv3/index.html` | ⛔ **已废弃**（2026-09-28 → 被 SM-101 取代，原因见 DEC-005） |
| SM-003 | 选择耗材（Choose your color） | `#step-material` | 历史（打印旅程） | `dayinlvchengv3/index.html` | 现行 |
| SM-004 | 仓内耗材选择弹窗 | `#filament-picker` | 历史（打印旅程） | `dayinlvchengv3/index.html` | 现行 |
| SM-005 | 任务上传弹窗 | `#upload-dialog` | 历史（打印旅程） | `dayinlvchengv3/index.html` | 现行 |
| SM-006 | **准备打印页** | `#prepare-print-screen` | 历史（打印页面） | `dayinji/自研款打印机打印页面原型/index.html` | 现行·**本次复用**（DEC-002） |
| SM-007 | 准备打印状态页 | `#prepare-state-screen` | 历史（打印页面） | 同上 | 现行 |
| SM-008 | 准备打印空态页 | `#prepare-empty-screen` | 历史（打印页面） | 同上 | 现行 |
| SM-009 | 打印任务控制面板（可打印/准备中/打印中/已暂停/已取消/打印完成） | `#task-panel` | 历史（打印页面） | 同上 | 现行 |
| SM-010 | 打印队列 | `#print-queue` | 历史（打印页面） | 同上 | 现行 |
| SM-011 | 设备设置页 | `#device-settings-screen` | 历史（设备设置） | 同上 | 现行 |
| SM-012 | 打印选项页 | `#print-options-screen` | 历史（设备设置） | 同上 | 现行 |
| SM-013 | 模型详情页（打印页侧） | `#model-detail-screen` | 历史（打印页面） | 同上 | 现行 |
| SM-014 | 耗材设置 / 类型 / 颜色 / 名称页 | `#material-settings-screen` 等 | 历史（耗材） | 同上 | 现行 |

## 二、本次新增页面（R001 模型编辑与切片）

| ID | 页面名 | 锚点 | 所属需求 | 原型文件 | 状态 |
|----|--------|------|----------|---------|------|
| SM-101 | **模型编辑页**（本模块主页面，入口：模型详情页底部左侧「打印设置」按钮） | `#model-editor` | R001 | `R001-模型编辑与切片/prototype/prototype_v1.0.html` | 现行 |
| SM-102 | 缩放面板（模型编辑页内嵌面板） | `#scale-panel` | R001 | 同上 | 现行 |
| SM-103 | **打印设置页**（模型编辑页「更多」进入；**顶部右侧「保存」已删除**，退出见 SM-104） | `#print-settings` | R001 | 同上 | 现行 |
| SM-104 | 保存范围选择弹窗（**改由顶部左侧「退出」触发**，含右上角关闭；底部按钮未选=取消/已选=确定） | `#save-scope-dialog` | R001 | 同上 | 现行（DEC-065 起改入口） |
| SM-105 | 恢复默认值确认弹窗 | `#restore-default-dialog` | R001 | 同上 | 现行 |
| SM-106 | 云切片 Loading 态 | `#slicing-loading` | R001 | 同上 | 现行 |
| SM-107 | 云切片失败态（由演示开关触发，见 DEC-003） | `#slice-failed` | R001 | 同上 | 现行 |
| SM-108 | 越界异常演示态（可选开关触发，见 DEC-007） | `#out-of-bounds` | R001 | 同上 | 现行 |
| SM-109 | 模型详情页（整图复用设计稿，底部左侧「打印设置」→ 模型编辑页） | `#model-detail` | R001 | 同上 | 现行（DEC-018 起改为整图复用） |
| SM-110 | **删除最后一个零件的二次确认弹窗** | `#delete-last-dialog` | R001 | 同上 | 现行（DEC-022） |
| SM-111 | **保存切片 · 命名弹窗** | `#save-name-dialog` | R001 | 同上 | 现行（DEC-024） |
| SM-112 | **保存切片 · 保存进度** | `#saving-progress` | R001 | 同上 | 现行（DEC-024） |
| SM-113 | **保存切片 · 保存成功弹窗** | `#save-done-dialog` | R001 | 同上 | 现行（DEC-024） |
| SM-114 | 我的切片页（**本期不实现**，仅由 SM-113「立即查看」指向） | — | R001 | 未生成 | 规划中 |

> ✅ **已确认（2026-09-28）**：SM-101 **取代** SM-002（DEC-005）；入口 = 模型详情页底部左侧「打印设置」按钮，返回落点为模型详情页（DEC-006）。
> ⚠️ 模型编辑页中的「打印盘」概念**单独定义**，不沿用原 builder 页的 `builder` 术语（详见 `GLOSSARY.md` GL-001 / DEC-005）。

## 三、R001 原型实测锚点（已通过 97 项自动化校验）

原型文件：`R001-模型编辑与切片/prototype/prototype_v1.0.html`

| 深链 | 落点 |
|------|------|
| `#model-detail` | 模型详情页（入口，含「打印设置」按钮） |
| `#model-editor` | 模型编辑页（Three.js 3D 视图 + 分盘 + 工具栏 + 去打印） |
| `#scale-panel` | 编辑页 + 缩放面板展开 |
| `#print-settings` | 打印设置页 |
| `#save-scope-dialog` | 打印设置页 + 保存范围弹窗 |
| `#restore-default-dialog` | 打印设置页 + 恢复默认确认弹窗 |
| `#slicing-loading` | 编辑页 + 云切片 Loading |
| `#slice-failed` | 切片失败页 |
| `#prepare-print` | 准备打印页 |
| `#out-of-bounds` | 编辑页 + 越界异常演示态 |
| `#delete-last-dialog` | 编辑页 + 删除最后一个零件的二次确认 |
| `#save-name-dialog` | 准备打印页 + 保存命名弹窗 |
| `#saving-progress` | 准备打印页 + 保存进度（停在 64%，便于截图） |
| `#save-done-dialog` | 准备打印页 + 保存成功弹窗 |

> 注：`SM-006 准备打印页`（dayinji 的 `#prepare-print-screen`）在 R001 中为**复刻重绘**而非 iframe 引用——
> 原因是盘数可变（1–8 盘）且需展示动态参数摘要，图片底图无法承载。视觉与交互沿用其既有设计。

## 四、R002 模型导入 新增页面（锚点段 2xx）

原型文件：`R002-模型导入/prototype/prototype_v1.0.html`（v1.0 历史快照，勿改）
　　　　`R002-模型导入/prototype/prototype_v1.1.html`（v1.1 现行，含切片预览页；复用同一份 vendor / assets）

| ID | 页面名 | 锚点 | 所属需求 | 状态 |
|----|--------|------|----------|------|
| SM-201 | **创意空间**（R002 入口页，整图复用设计稿 + 透明热区） | `#creative-space` | R002 | 现行 |
| SM-202 | 模型编辑页**空态**（3D 视图区为空 · 去打印置灰） | `#import-empty-editor` | R002 | 现行 |
| SM-203 | **导入选择弹窗**（自下而上 · 左右菜单 · 底部按钮固定 · 高于缩放面板） | `#import-sheet` | R002 | 现行 |
| SM-204 | 导入选择弹窗 ·「我的切片」Tab | `#import-sheet/slice` | R002 | 现行 |
| SM-205 | 模拟手机系统文件目录（多选 + 已选计数） | `#system-picker` | R002 | 现行（模拟页，正式产品调系统选择器） |
| SM-206 | 「当前文件格式不支持」弹窗 | `#format-unsupported` | R002 | 现行 |
| SM-207 | 「文件超过 100MB」压缩确认弹窗 | `#compress-dialog` | R002 | 现行 |
| SM-208 | 「文件过大，无法继续导入」弹窗 | `#too-large` | R002 | 现行 |
| SM-209 | 导入中（进度 + 当前文件 + i/N） | `#import-progress` | R002 | 现行 |
| SM-210 | 导入结果弹窗（全部成功 / 部分成功 / 全部失败） | `#partial-result`、`#import-multi-result` | R002 | 现行 |
| SM-211 | 导入失败（可重试） | `#import-failed` | R002 | 现行 |
| SM-212 | 网络提醒条 + 无网自动弹窗 | `#offline-dialog` | R002 | 现行（复用 —— 见 GL-033） |
| SM-213 | 无网文件目录（仅 gcode，非 gcode 锁定） | `#offline-picker` | R002 | 现行 |
| SM-214 | 无网绑定门禁弹窗（未绑定 / 失效 / 未登录 / 超期） | `#offline-unbound`、`#offline-invalid`、`#offline-guest`、`#offline-expired` | R002 | 现行 |
| SM-215 | **无网文件传输页**（复用 SM-005 的实现） | `#offline-transfer` | R002 | 现行（DEC-041） |
| SM-216 | 无网「**上传中**」进度弹窗（替代云切片 Loading） | `#upload-progress` | R002 | 现行（DEC-045 / BR-037） |
| SM-217 | 无网「**上传完成**」提示弹窗 | `#upload-done` | R002 | 现行（文案「当前已成功上传模型文件，请联网查看当前打印机状态。」） |
| SM-220 | **无网热点引导页**（图文两步：长按红色重置键 → 点底部「去打印」；圆角 30px 紫→蓝渐变按钮；点按钮后自动连打印机热点，连上才进文件目录） | `#offline-guide`、`#offline-guide-connecting` | R002 | 🆕 现行（BR-064 / DEC-075，v1.1.4） |
| SM-218 | **准备打印页 + 顶部无网标签**（覆盖设计稿「准备打印」字样 + 整页下移） | `#offline-prepare` | R002 | 现行（DEC-046 / BR-038） |
| SM-219 | **切片预览页**（只读 · 白膜实模按已切片层数裁断 + 顶部回退 + 右侧高度计〔顶 500 层/底 1 层〕 + 底部 G-code 预览〔耗材尺寸=长×宽×高〕 + 紫→蓝渐变打印按钮） | `#slice-preview` | R002 | 现行（**v1.1 新增、v1.1.1 改高度计语义**，DEC-069 / DEC-070 / DEC-071 / DEC-072 / GL-034 / GL-035 / GL-036；**仅存在于 `prototype_v1.1.html`**，v1.0 无此页） |

### R002 复用 / 继承的既有页面

| ID | 页面名 | 原所属 | 现所属 | 说明 |
|----|--------|--------|--------|------|
| SM-005 | 任务上传弹窗 | 历史（打印旅程） | 历史, **R002** | R002 的「无网文件传输页」**复用其视觉与进度交互**，只改文案（BR-033 / DEC-041）；落地方式为移植实现进 R002 原型单文件 |
| SM-101 | 模型编辑页 | R001 | R001, **R002** | R002 的导入落点页；R002 在其上**新增空态**、**「添加」按钮**、**导入选择弹窗**三层叠加；返回落点按入口分支（BR-030）；空态保留 3D 展示区（BR-039） |
| SM-006 | 准备打印页 | 历史（打印页面） | 历史, R001, **R002** | 其「保存切片」是「我的切片」（SM-204）的**数据写入方**（DEC-024 / DEC-031）；无网时顶部加无网标签（SM-218） |

> ✅ **R002 原型实测**：`node R002-模型导入/prototype/_verify/check.mjs` → **155 项断言全绿**，
> 覆盖 SM-201 ~ SM-218 全部锚点 + 36 条深链 + R001 既有链路回归。

## 五、R003 分享打印机 新增页面（锚点段 3xx）

原型文件：`dayinji/自研款打印机打印页面原型/index.html`（在打印页面原型上增量扩展）

| ID | 页面名 | 锚点 | 所属需求 | 状态 |
|----|--------|------|----------|------|
| SM-301 | **添加打印机页顶部「分享打印机」入口**（自绘胶囊按钮，右缘与卡片对齐、略低于标题） | `#open-share-printer` | R003 | 现行 |
| SM-302 | **分享打印机页**（真实 DOM 高保真页，非整图复用） | `#share-printer-screen` | R003 | 现行 |
| SM-303 | 设备选择面板（底部弹出，Owner 名下 3 台打印机） | `#share-device-sheet` | R003 | 现行 |
| SM-304 | 系统分享面板（示意；真机走 `navigator.share`） | `#share-target-sheet` | R003 | 现行 |
| SM-305 | 异常与边界状态演示面板 | `#share-demo-sheet`（入口 `#share-demo-toggle`） | R003 | 现行 |
| SM-306 | 通用二次确认弹窗（重新生成邀请码 / 移除成员） | `#share-confirm-dialog` | R003 | 现行 |
| SM-307 | 通用提示弹窗（生成失败 / 人数上限 / 无可分享设备） | `#share-alert-dialog` | R003 | 现行 |
| SM-308 | **共享成员管理页** | `#member-manage-screen` | R003 | 现行 |

深链（`?share=`）：`normal` / `no-device` / `offline` / `expired` / `member-limit` / `gen-failed`，
直接落在 SM-302 的对应状态，并预先把「SM-301 添加打印机页 → SM-302 分享页」两级跳转栈建好。

> ✅ **原型的分享页无设计稿**，故不用「整图复用」而按设计规范自绘 DOM（DEC-049）；
> 二维码、打印机渲染图由脚本生成（DEC-050 / DEC-051）。
> 校验：`node tests/share-printer-e2e.mjs` → **221 项断言全绿**，另有 10 张验收图。

## 六、R004 加入共享打印机 新增页面（配网流程原型内）

| ID | 页面名 | 锚点 | 所属需求 | 状态 |
|----|--------|------|----------|------|
| SM-401 | 演示台（账号类型 / 邀请数据 / 设备状态） | `#screen-demo`（`?screen=demo`） | R004 | 现行 |
| SM-402 | 儿童受限账号起始页（按钮改写层） | `#start-account-overlay` | R004 | 现行 |
| SM-403 | 成人认证占位页（本期不实现） | `#screen-auth-todo`（`?screen=auth-todo`） | R004 | 现行 |
| SM-404 | **加入共享打印机**（扫码卡 + 邀请码输入） | `#screen-join-scan`（`?screen=join-scan`） | R004 | 现行 |
| SM-405 | 模拟扫码界面（代替真实相机） | `#screen-join-camera`（`?screen=join-camera`） | R004 | 现行 |
| SM-406 | **确认邀请**（邀请人 + 设备卡 + 权限说明） | `#screen-join-confirm`（`?screen=join-confirm`） | R004 | 现行 |
| SM-407 | **加入成功** | `#screen-join-done`（`?screen=join-done`） | R004 | 现行 |

深链：`?account=parent|child`、`?invite=valid|invalid|expired|already-joined|family-conflict`、`?device=online|offline`。

## 七、发布（两套原型同站点）

两套原型用 `../../` 相对路径互跳，**必须发布在同一个站点里**并由脚本统一生成发布目录：

| 项 | 值 |
|----|----|
| 发布目录生成器 | `lianjiepeiwnag/打印机首次配网连接流程原型/tests/build-publish.py` → `ziyan/_publish-prototypes`（约 14 MB，只复制被引用到的资源，自带发布根页） |
| 发布后互通校验 | `lianjiepeiwnag/打印机首次配网连接流程原型/tests/publish-links-check.mjs <站点根URL>`（28 项断言） |
| 目录结构要求 | `lianjiepeiwnag/…`、`dayinji/…`、`src/`、`原型修改复用图片资源/`、`ugee/` 的层级不变；分开发布成两个站点会让跨原型跳转 404 |
| 当前线上地址（2026-10-19） | `https://ziyan-printer-prototypes.upbeattide17.chatgpt.site`，Sites 部署成功，所有人可访问，包含 r012 的 UG-01/UG-02 修改。用户最新授权按新旧两条路径中步骤更少者执行；后续复用此站点，详见 `SITES_HOSTING.md`。旧 WorkBuddy 地址 `https://9cc38d446e9c46c590783b982a6f0e68.app.workbuddy.host/` 保留未改，更新需要原工作区运行时。 |
| 静态资源版本串 | `?v=r007`（2026-10-08 抬起；源 `dayinji/自研款打印机打印页面原型/index.html` 与发布目录同步维护），改文件必须抬版本号；由 `tests/prototype-contract.ps1` 强制校验 |
| 线上验收脚本 | `dayinji/自研款打印机打印页面原型/tests/check-online-filament.mjs <站点根URL> [查询串]`（真实浏览器断言句柄注入 + 插画 `naturalWidth > 0`）。注意：`publish-links-check.mjs` 固定 900ms 等待，对线上跑会因网络延迟误报（2026-10-08 实测本地 28/28 过、线上误报 6 项，线上字节与本地一致），线上验收以专项探测为准 |
| 跨原型链路 | 配网终页「已完成，取消」→ 打印页面原型；打印页「添加打印机 → 配置新的打印机」→ 配网 `?screen=printer-select`；加入成功「查看我的打印机」→ 打印页面原型 |

## 八、R005 进料中 / 退料中（真实 DOM 页面，位于打印页面原型内）

| ID | 页面/状态 | 锚点 | 所属需求 | 状态 |
|----|-----------|------|----------|------|
| SM-501 | 进料中 · 加热喷嘴温度（圆环整圈脉冲 + 温度块 + 6s 耐心提示） | `#filament-operation-screen[data-operation=feed][data-step=1]` | R005 | 现行 |
| SM-502 | 进料中 · 抽回当前耗材（进度弧 + 插画 + 百分比） | 同上 `data-step=2` | R005 | 现行 |
| SM-503 | 进料中 · 送出新耗材（蓝底提示条「观察是否有耗材丝送出」） | 同上 `data-step=3` | R005 | 现行 |
| SM-504 | 进料完成（100% + 「完成」按钮） | 同上 `data-phase=done` | R005 | 现行 |
| SM-505 | 退料中 · 加热喷嘴温度 | 同上 `data-operation=retract` | R005 | 现行 |
| SM-506 | 退料中 · 退出当前耗材 | 同上 `data-step=2` | R005 | 现行 |
| SM-507 | 退料完成（步骤条第 3 点「退料完成」） | 同上 `data-phase=done` | R005 | 现行 |
| SM-508 | 取消进料 / 取消退料二次确认弹窗 | `#filament-cancel-dialog` | R005 | 现行 |

配图：`assets/耗材操作-进料-抽回当前耗材.png`、`assets/耗材操作-进料-送出新耗材.png`、`assets/耗材操作-退料-退出当前耗材.png`、`assets/耗材操作-退料-退料完成.png`（由 `assets/_tools_make_filament_assets.py` 从 `原型修改复用图片资源/进料中.png`、`退料中.png` 裁切 + 去背）。

## 九、发布（两套原型同站点）— 版本号约定

静态资源一律带 `?v=` 版本查询串（当前 `r005`）：`styles.css`、`styles-share-printer.css`、`styles-filament-operation.css`、`share-code-pool.js`、`prototype.js`。**改动这些文件后必须升版本号**，否则浏览器会命中网关的旧分片（表现：新 HTML + 旧 JS → `Cannot read properties of null`）。上线地址与校验方式见 R004 章节。
