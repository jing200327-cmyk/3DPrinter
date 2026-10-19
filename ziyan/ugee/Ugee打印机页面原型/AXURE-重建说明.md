# Axure RP 重建说明

## 文件状态

当前工作区只有 Axure 发布后的 HTML，没有 `.rp` 源文件，本机也未安装 Axure RP。发布后的 HTML 不能直接还原成可编辑的 `.rp`，因此本包提供完整 HTML 源码、原始图片和以下重建规格。获得 Axure RP 环境或一个空白 `.rp` 模板后，可按此规格快速生成真正的源工程。

## 页面基础

| 项目 | 数值 |
| --- | --- |
| 页面名称 | Ugee 打印机设备页 |
| 设计宽度 | 390 px |
| 首屏高度 | 844 px |
| 页面背景 | `#F4F5FA` |
| 主内容左右边距 | 16 px |
| 主内容模块间距 | 16 px |
| 主字体 | PingFang SC / Microsoft YaHei |
| 主文字色 | `#2F343D` |
| 开关开启色 | `#FF9D1C` |

## 分层结构

1. `Header_Original`：顶部原图裁切组，高 139.2 px。
   - 图片：`assets/ugee-page-1.jpg`。
   - 使用原图坐标 `x=0, y=0, w=1216, h=434`，缩放到页面宽 390 px。
   - 在切换图标和设置卡片上放透明热区，视觉不可改变。
2. `Timelapse_Placeholder`：延时摄影占位，页面 `x=16, w=358`，比例 `1112:669`，圆角 17 px。
   - 使用原图坐标约 `x=52, y=485, w=1112, h=669`。
3. `Task_Panel`：白色任务卡片，圆角 20 px。
   - 顶部状态条：72% 卡片宽，浅蓝 `#E9F3FF`，底部圆角 28 px。
   - 内容行：模型图 86 × 106 px；右侧名称、规格、剩余时间、百分比和 8 px 进度条。
   - 操作行：暂停/取消各占一列，间距 12 px，高 48 px，胶囊描边按钮。
   - 底部 `Queue_DP`：动态面板，两种状态“收起/展开”。
4. `Filament_Actions`：两个等宽白色卡片，间距 16 px，高 108 px，圆角 18 px。
5. `Control_Carousel_DP`：横向动态面板，白底，圆角 18 px，高 156 px。
   - 每项宽 118.67 px，默认窗口显示 3 项。
   - 顺序：舱内灯、舱外灯、风扇、提示音。
   - 项目间 1 px 分隔线；图标 40 px；开关 52 × 30 px。
   - 两个分页点位于卡片下方，当前页为 18 × 7 px 胶囊，非当前页为 7 × 7 px 圆点。
6. `Bottom_Nav_Original`：固定底部，高 78 px，直接使用 Ugee 原图裁切，不修改视觉。

## 动态面板与交互

| 触发对象 | Axure 实现 | 结果 |
| --- | --- | --- |
| 打印队列 | 点击时设置 `Queue_DP` 状态，推动下方元件 | 展开/收起 1 个待打印任务 |
| 暂停 | 点击时设置任务状态文本与按钮文本 | “打印中/已暂停”“暂停/继续”切换 |
| 取消 | 显示确认弹窗 | 确认后任务状态改为“已取消” |
| 进料/退料 | 点击时显示轻提示 | 提示喷嘴预热并开始对应动作 |
| 四个控制开关 | 每项使用两状态动态面板 | 橙色开启、灰色关闭 |
| 控制菜单 | `Control_Carousel_DP` 两状态；向左拖动切到状态 2，向右拖动切回状态 1 | 状态 1 显示前三项；状态 2 显示后三项 |
| 分页点 | 跟随控制菜单状态 | 当前页使用胶囊高亮 |
| 切换打印机 | 顶部透明热区 | 打开打印机选择层 |
| 设置 | 顶部透明热区 | 打开打印机设置页或设置反馈 |

## 推荐的 Axure 元件命名

- `Header_Original`
- `Hotspot_PrinterSwitch`
- `Hotspot_PrinterSettings`
- `Timelapse_Placeholder`
- `Task_Panel`
- `Task_Status`
- `Task_ModelPreview`
- `Task_Progress`
- `Button_Pause`
- `Button_Cancel`
- `Queue_DP`
- `Button_Feed`
- `Button_Retract`
- `Control_Carousel_DP`
- `Switch_CabinLight`
- `Switch_OuterLight`
- `Switch_Fan`
- `Switch_Sound`
- `Bottom_Nav_Original`

HTML 中的 `id` 与上述元件含义一一对应，可将 `index.html` 作为视觉和交互对照稿。
