# API 参考概览

AGW 提供两套 API：

## 1. 消费者调用 API（OpenAI 兼容）

面向最终用户的 API，完全兼容 OpenAI Chat Completions 格式。你的应用**无需修改代码**即可从 OpenAI 切换到 AGW，只需改 Base URL 和 API Key。

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v1/models` | GET | 获取可用模型列表 |
| `/v1/chat/completions` | POST | 对话补全（支持 stream） |

详细文档：[代理调用 API](./proxy-api)

## 2. 管理 API

面向管理面板的 RESTful API，提供所有管理功能。

| 模块 | Base Path | 说明 |
|------|-----------|------|
| 密钥管理 | `/api/keys` | 消费者密钥 CRUD |
| 渠道管理 | `/api/channels` | 渠道 CRUD + 模型同步 |
| 账号管理 | `/api/accounts` | 上游账号 CRUD |
| 分组管理 | `/api/groups` | 渠道分组 + 密钥分组 |
| 统计分析 | `/api/stats` | 多维度数据查询 |
| 插件管理 | `/api/plugins` | 插件安装/配置/监控 |
| 系统配置 | `/api/config` | 系统设置管理 |

详细文档：[管理 API 参考](./management-api)

## 通用约定

| 项目 | 约定 |
|------|------|
| 内容类型 | `application/json; charset=utf-8` |
| 消费者认证 | `Authorization: Bearer sk-xxx` |
| 管理认证 | `Authorization: Bearer <jwt_token>` |
| 分页 | `?page=1&page_size=20` |
| 时间格式 | ISO 8601 (`2026-05-04T10:30:00Z`) |
| 国际化 | `Accept-Language: zh-CN` / `en-US` |