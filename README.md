# AGW 文档站

AGW（AIGateway）产品文档站点，基于 [VitePress](https://vitepress.dev/) 构建。

## 快速开始

```bash
npm install
npm run dev    # 启动开发服务器（热更新）
npm run build  # 构建静态站点到 .vitepress/dist/
```

## 文档结构

```
guide/          用户指南（快速开始、配置、使用）
architecture/   系统架构（设计理念、路由、账号池）
modules/        核心模块（源码级详解）
plugin-dev/     插件开发（接口规范、权限框架）
api/            API 参考（代理 API + 管理 API）
```

## 文件约定

- 所有 `.md` 文件使用 VitePress 标准 Markdown（内置支持代码高亮、提示框、表格等）
- 一级标题 `#` 为页面标题
- 代码块指定语言以启用高亮：```` ```go ````

## 贡献

文档修改请通过 PR 提交。代码变更需要同步更新对应文档时，请同时提交 agw-doc 的修改 PR。