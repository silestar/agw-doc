# 代理调用 API

AGW 完全兼容 [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat)。

## Base URL

```
http://<your-agw-host>:8080/v1
```

## 认证

所有请求在 HTTP Header 中携带 Consumer Key：

```
Authorization: Bearer sk-your-consumer-key
```

## 获取模型列表

```
GET /v1/models
```

返回消费者有权访问的模型列表。

### 响应

```json
{
  "object": "list",
  "data": [
    {"id": "gpt-4", "object": "model", "created": 1687882411, "owned_by": "openai"},
    {"id": "claude-3-opus", "object": "model", "created": 1700000000, "owned_by": "anthropic"}
  ]
}
```

## 对话补全

```
POST /v1/chat/completions
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `model` | string | ✅ | 模型名 |
| `messages` | array | ✅ | 消息数组 |
| `stream` | boolean | 否 | 是否流式（默认 false） |
| `temperature` | number | 否 | 采样温度（0-2） |
| `max_tokens` | integer | 否 | 最大生成 Token |
| `top_p` | number | 否 | 核心采样 |

### 非流式请求

```bash
curl http://localhost:8080/v1/chat/completions   -H "Authorization: Bearer sk-your-key"   -H "Content-Type: application/json"   -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### 响应

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1716800000,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}
```

### 流式请求

```bash
curl -N http://localhost:8080/v1/chat/completions   -H "Authorization: Bearer sk-your-key"   -H "Content-Type: application/json"   -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### 流式响应（SSE）

```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant","content":"Hello"},"index":0}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","choices":[{"delta":{"content":"!"},"index":0}]}

data: [DONE]
```

## 错误响应

```json
{
  "error": {
    "message": "No available channels for model: gpt-4",
    "type": "no_available_channel",
    "code": "404"
  }
}
```

## 多模态支持

传图方式和 OpenAI 一致：

```json
{
  "model": "gpt-4-vision",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What's in this image?"},
        {"type": "image_url", "image_url": {"url": "https://..."}}
      ]
    }
  ]
}
```

## 代码示例

### Python

```python
import openai

client = openai.OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="sk-your-consumer-key"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### Node.js

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'sk-your-consumer-key',
});

const completion = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(completion.choices[0].message.content);
```