# 关于 AGW

AGW（AIGateway）是一个**高性能多租户 AI API 聚合代理系统**。它像一个智能中间人，帮你统一管理多个上游 AI 服务商（OpenAI、Anthropic、Gemini 等）的 API 调用。

## 它能解决什么问题？

| 痛点 | AGW 的解法 |
|------|-----------|
| 多个 AI 服务商，API 不统一 | 统一 OpenAI Chat Completions 协议，下游零适配 |
| 单账号限流严重，高频调用不够用 | 单渠道多账号，优先级 + 粘性复用 + 故障降级 |
| 账号被封不知道，请求默默失败 | 自动健康巡检，关键词/状态码自动禁用，探测恢复 |
| 不知道钱花去哪了 | 全链路追踪（含重试链），按密钥/渠道/模型多维统计 |
| 需要给不同用户分配不同 Keys | 多租户消费者系统，独立 Key + 配额 + 分组权限 |

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Go 1.22 + Gin + GORM + SQLite/MySQL/PostgreSQL |
| 前端 | Vue 3 + TypeScript + Naive UI + vue-i18n |
| 加密 | AES-256-GCM（密钥加密存储） |
| 日志 | zap（按日归档） |
| 部署 | Docker 多阶段构建 + docker-compose |

## License

MIT