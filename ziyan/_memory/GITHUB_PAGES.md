# GitHub Pages 原型发布

2026-10-20 用户明确指定：后续每次修改原型后，继续发布到固定打印页 https://jing200327-cmyk.github.io/3DPrinter/dayinji/自研款打印机打印页面原型/index.html 。此约定优先于此前 Sites / WorkBuddy 默认发布选择；沿用 gh-pages，不更换域名与路径。发布后回读原地址并验证更新已生效。

2026-10-20 用户要求尝试 GitHub Pages，以便国内无需代理访问。已实际发布，国内全网稳定性尚未验证。部署成功不等于国内稳定直连。

- 地址：https://jing200327-cmyk.github.io/3DPrinter/
- 打印页面：https://jing200327-cmyk.github.io/3DPrinter/dayinji/自研款打印机打印页面原型/index.html
- 仓库：https://github.com/jing200327-cmyk/3DPrinter
- 源码分支：feature/prd-prototype-revision-20261019，未改 main。
- 发布分支：gh-pages，根目录 /，含 .nojekyll；只存构建产物，不合并回源码分支。
- 发布 checkout：E:\3Dprinter\pages\printer-prototypes
- 已发布提交：4b20c5e369f924525f72b0a4ff788932b49d211b（准备打印页 HTML 高保真、静态单耗材与颜色不匹配展示）
- GitHub Pages API：status=built、https_enforced=true。
- 部署任务：https://github.com/jing200327-cmyk/3DPrinter/actions/runs/39368036821 ，结论 success。

后续更新：先确认发布 checkout 无本地改动并拉取 gh-pages；从源码运行原 build-publish.py，将输出指定到发布 checkout；检查差异与资源引用、提交并正常推送 gh-pages，等待自动部署并回读。生成器覆盖同名文件但不清理旧文件；资源删除或重命名时核对并清理不再引用的旧产物。不强推，不改变源码分支。

验证：

- 14.4 MB 捆绑包，资源引用扫描无断链，原型间相对路径完整。
- 真实 Chrome 线上通过 UG-01 拦截、UG-02 连接/去重、返回保留、键盘、四种视口、分享及配网跳转；同一用例本地回归也通过。
- Python ProxyHandler({}) 禁用 HTTP 代理：打印页 HTML 和 prototype.js 为 200，包含新增逻辑；根入口两次请求连接关闭。
- curl --noproxy '*'：根入口为 200；随后 index.html 请求出现 TLS 握手失败。
- 仅代表本机当时网络，不能证明不存在系统级路由/VPN，也不能代表国内各运营商。用户实际国内网络仍不可达时，需要另选托管或域名；不把 Pages 描述为国内可达性的保证。

原 Sites 和 WorkBuddy 站点保留，未改其内容或访问权限。

2026-10-20 本次更新已部署到固定打印页：部署任务 completed / success；原地址 HTML 返回 200，包含 styles-prepare-print.css?v=r001，已移除 prepare-artwork 整页截图。发布构建目录与线上固定地址均通过完整准备页浏览器验收（静态单耗材、绿色需求色与蓝色料盘不匹配、选盘、拖动、三盘 3D 与返回、延时摄影、打印机切换、开始打印、队列准备页与四种视口）。
