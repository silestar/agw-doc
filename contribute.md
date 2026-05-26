# 贡献指南

欢迎为 AGW 贡献代码、文档或插件！

## 环境搭建

```bash
# 克隆仓库
git clone https://github.com/silestar/AIGateway.git
cd AIGateway

# 后端
go build -buildvcs=false -o agw ./cmd/agw/
./agw

# 前端
cd web
npm install
npm run dev
```

## 项目结构

| 目录 | 说明 |
|------|------|
| `cmd/agw/` | 主程序入口 |
| `internal/` | 核心业务逻辑（不可外部导入） |
| `pkg/` | 可公开导入的库（适配器、SDK） |
| `web/` | Vue 3 前端工程 |
| `docs/` | 开发设计文档 |

## 提案流程

新功能或重大改动请先提交设计方案：

1. 在 `docs/proposals/` 下创建 `YYYYMMDD-简短描述.md`
2. 说明背景、设计思路、影响范围
3. 讨论通过后再开始编码
4. 实施完成的提案移至 `docs/proposals/archive/`

## 提交规范

- `feat: 中文描述` — 新功能
- `fix: 中文描述` — Bug 修复
- `refactor: 中文描述` — 重构
- `docs: 中文描述` — 文档更新

## 代码风格

- **Go**：遵循 gofmt 标准格式，接口驱动 + uber/dig 依赖注入
- **Vue 3**：Composition API，TypeScript，Naive UI 组件库
- **命名**：文档用中文名 + 前缀数字（表示阅读顺序）；代码包用小写英文