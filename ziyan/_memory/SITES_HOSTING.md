# 原型 Sites 发布记录

2026-10-19 用户授权：比较重用旧链接和发布新链接，执行步骤更少的方法。本环境缺 WorkBuddy 运行时，故使用 Sites 发布新链接。后续复用此站点，避免重复创建。

- 当前地址：https://ziyan-printer-prototypes.upbeattide17.chatgpt.site
- 访问范围：2026-10-19 按用户要求改为 public，所有人可通过链接访问；后续发布保持公开。
- project_id：`appgprj_6ad5cca2861081918956f044fcb9b305`
- 发布 checkout：`E:\3Dprinter\sites\printer-prototypes`
- 身份文件：上述 checkout 的 `.openai/hosting.json`，静态目录为 `dist`。
- 已发布源码 SHA：`ba295e0ab83f174aff1c88ffb41a6ac03025387e`
- version_id：`appgprj_6ad5cca2861081918956f044fcb9b305~appgver_f66c35138e84819183579e74878db233`
- deployment_id：`appgdep_6ad5cfd7fd4c81918e68e2c56ede28a7`
- 部署状态：`succeeded`（2026-10-19T08:08:06Z），发布包 `E:\3Dprinter\sites\printer-prototypes-release.tar.gz`。

后续更新：读取 Sites 技能，复用 project_id，获取新短期源码凭证；用原 build-publish.py 生成配网/打印捆绑包并同步至 dist，保留全部相对目录。使用 Sites 官方 site-workflow.mjs 同步源码、打包，按当前访问范围部署保存版本。凭证只经隐藏标准输入传入，不落盘、不写日志。

本机 Windows 兼容配置：将 `E:\Downloads\Git\bin` 与捆绑 Node bin 放在 PATH 前部，避免调用系统 WSL bash；设置 `TAR_OPTIONS=--force-local`，避免 tar 将 Windows 盘符解释为远程主机。首次源码上传使用本地 Git 配置 `http.version=HTTP/1.1`、`http.postBuffer=52428800`。不修改官方助手脚本。

验证：发布文件 index.html、index-offline.html、prototype.js、styles.css 与 c112412 对应源码逐字节一致；原验收含 UG-01 拦截、UG-02 连接、四种视口和分享 221 项回归。Sites 部署服务已确认成功；没有声称完成登录后线上浏览器复验。

旧 WorkBuddy 地址 https://9cc38d446e9c46c590783b982a6f0e68.app.workbuddy.host/ 未更新。用户移交说明要求在原 `D:\Users\Administrator\Desktop\ziyan` 工作区对旧址绑定的同一发布目录调用 `workbuddy_cloudstudio_deploy`；本机该路径不存在且没有该运行时工具。
