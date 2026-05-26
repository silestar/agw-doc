# 通信协议

## 总览

AGW 与插件之间通过 HTTP 通信，AGW 作为客户端，插件作为服务端。

## 请求格式

```
POST /hook/<hook_name> HTTP/1.1
Host: 127.0.0.1:<plugin_port>
Authorization: Bearer <plugin_auth_token>
Content-Type: application/json
X-AGW-Request-ID: req_abc123

{
  "hook": "pre_request",
  "request_id": "req_abc123",
  "timestamp": 1716800000,
  "data": {
    "model_name": "gpt-4",
    "channel_id": 5,
    "request_body_summary": "hello world...",
    // ... 其他权限字段
  }
}
```

## 响应格式

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "action": "continue",     // continue | reject | modify
  "message": "ok",
  "data": {}
}
```

## Action 类型

| action | 含义 | 效果 |
|--------|------|------|
| `continue` | 继续 | 请求正常流转 |
| `reject` | 拒绝 | 返回错误给客户端（pre_request）或丢弃响应（post_response） |
| `modify` | 修改 | 用 `data` 中的字段覆盖原始数据 |

### reject 示例

```json
{
  "action": "reject",
  "message": "内容包含敏感词",
  "status_code": 403
}
```

### modify 示例（post_response）

```json
{
  "action": "modify",
  "data": {
    "response_body": "{\"filtered\": true, \"original\": \"...\"}",
    "response_status": 200
  }
}
```

## 超时处理

- 默认超时：5 秒
- 超时后：主系统执行兜底策略
  - `pre_request`：跳过继续（不阻塞请求）
  - `post_response`：丢弃插件处理
  - 写入告警日志

## 认证要求

插件**必须**验证请求中的 `Authorization: Bearer <token>`，不匹配返回 `401`。

## 请求 ID

`X-AGW-Request-ID` 贯穿整条链路（客户端 → AGW → 插件 → 上游），用于全链路追踪。