# API 一览

## 消费者调用 API（兼容 OpenAI）

| 端点 | 说明 |
|------|------|
| `GET /v1/models` | 获取可用模型列表 |
| `POST /v1/chat/completions` | 对话补全（流式/非流式） |
| `OPTIONS /v1/chat/completions` | CORS 预检 |

### 调用示例

```bash
# 获取模型列表
curl http://localhost:8080/v1/models   -H "Authorization: Bearer sk-your-key"

# 非流式对话
curl http://localhost:8080/v1/chat/completions   -H "Authorization: Bearer sk-your-key"   -H "Content-Type: application/json"   -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hi"}]}'

# 流式对话
curl http://localhost:8080/v1/chat/completions   -H "Authorization: Bearer sk-your-key"   -H "Content-Type: application/json"   -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hi"}],"stream":true}'
```

## 管理 API

管理 API 需要 JWT Token（通过面板登录获取）。

| 端点 | 说明 |
|------|------|
| `POST /admin/login` | 管理员登录 |
| `GET/POST/PUT/DELETE /admin/channels` | 渠道 CRUD |
| `GET/POST/PUT/DELETE /admin/accounts` | 账号 CRUD |
| `GET/POST/PUT/DELETE /admin/consumers` | 消费者 CRUD |
| `GET /admin/stats/*` | 统计数据查询 |
| `GET/POST/PUT/DELETE /admin/plugins` | 插件管理 |

详细管理 API 文档见 [管理 API 参考](/api/management-api)。