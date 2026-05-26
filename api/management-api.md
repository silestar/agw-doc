# 管理 API 参考

> 完整的 API 规范详见 AGW 仓库源码：`docs/modules/07-管理API接口规范.md`
> 本文档提供模块概览和常用示例，完整文档请参考源码仓库。

## 通用约定

- **Base URL**：`/api`
- **认证**：JWT Token（`Authorization: Bearer <jwt>`）
- **分页**：`?page=1&page_size=20`
- **时间**：ISO 8601

## 模块一览

### 密钥管理 `/api/keys`

| 端点 | 说明 |
|------|------|
| `GET /api/keys` | 密钥列表（支持搜索、状态筛选） |
| `POST /api/keys` | 创建密钥 |
| `GET /api/keys/:id` | 密钥详情（含今日统计） |
| `PUT /api/keys/:id` | 修改密钥名称/状态 |
| `DELETE /api/keys/:id` | 吊销密钥 |
| `POST /api/keys/:id/regenerate` | 重新生成 Key |

### 渠道管理 `/api/channels`

| 端点 | 说明 |
|------|------|
| `GET /api/channels` | 渠道列表 |
| `POST /api/channels` | 创建渠道 |
| `GET /api/channels/:id` | 渠道详情（含账号列表） |
| `PUT /api/channels/:id` | 修改渠道配置 |
| `DELETE /api/channels/:id` | 删除渠道 |
| `POST /api/channels/:id/models/sync` | 触发模型同步 |
| `GET /api/channels/:id/models` | 渠道模型列表 |
| `PUT /api/channels/:id/models/:model_id` | 编辑模型映射 |

### 账号管理 `/api/accounts`

| 端点 | 说明 |
|------|------|
| `GET /api/accounts` | 账号列表（可按渠道/状态筛选） |
| `POST /api/accounts` | 添加账号 |
| `PUT /api/accounts/:id` | 修改账号（优先级/分组） |
| `DELETE /api/accounts/:id` | 删除账号 |
| `POST /api/accounts/:id/reset` | 重置账号状态（强制恢复 active） |

### 分组管理 `/api/groups`

| 端点 | 说明 |
|------|------|
| `GET /api/groups/channel` | 渠道分组列表 |
| `POST /api/groups/channel` | 创建渠道分组 |
| `GET /api/groups/key` | 消费者分组列表 |
| `POST /api/groups/key` | 创建消费者分组 |

### 统计分析 `/api/stats`

| 端点 | 说明 |
|------|------|
| `GET /api/stats/overview` | 仪表盘概览 |
| `GET /api/stats/channels` | 渠道维度统计 |
| `GET /api/stats/accounts` | 账号维度统计 |
| `GET /api/stats/consumers` | 消费者维度统计 |
| `GET /api/stats/models` | 模型维度统计 |
| `GET /api/stats/logs` | 请求日志查询 |

### 插件管理 `/api/plugins`

| 端点 | 说明 |
|------|------|
| `GET /api/plugins` | 已安装插件列表 |
| `POST /api/plugins` | 安装插件 |
| `GET /api/plugins/:id` | 插件详情 + 日志 |
| `PUT /api/plugins/:id/hooks` | 启用/禁用钩子 |
| `PUT /api/plugins/:id/permissions` | 配置权限 |
| `DELETE /api/plugins/:id` | 卸载插件 |

## 常用示例

### 创建渠道

```bash
curl -X POST http://localhost:8080/api/channels   -H "Authorization: Bearer <admin-jwt>"   -H "Content-Type: application/json"   -d '{
    "name": "OpenAI-Pro",
    "adapter": "openai",
    "base_url": "https://api.openai.com",
    "weight": 70,
    "group_ids": [1]
  }'
```

### 添加账号

```bash
curl -X POST http://localhost:8080/api/accounts   -H "Authorization: Bearer <admin-jwt>"   -H "Content-Type: application/json"   -d '{
    "channel_id": 1,
    "api_key": "sk-...",
    "priority": 100
  }'
```

### 查询统计

```bash
curl "http://localhost:8080/api/stats/overview?days=7"   -H "Authorization: Bearer <admin-jwt>"
```

---

## 完整规范

管理 API 的完整定义请参考源码仓库中的 `docs/modules/07-管理API接口规范.md`。