# 渠道类型插件

## 什么是渠道类型插件？

当 AGW 内置的适配器（openai/anthropic/gemini）无法满足需求时，渠道类型插件提供自定义协议适配能力。

## 适用场景

| 场景 | 说明 |
|------|------|
| 自建推理服务 | 自定义协议，非 OpenAI 兼容 |
| 特殊业务逻辑 | 请求需要特定签名、加密 |
| 非标准 API | 特定云厂商的 AI 接口 |

## 与标准插件的区别

| | 标准插件 | 渠道类型插件 |
|------|---------|------------|
| 介入层级 | 钩子层 | 适配器层 |
| 生命周期 | 随请求启动 | 随渠道启动 |
| 通信协议 | HTTP JSON | HTTP 双向流 |
| 能力范围 | 按钩子分 | 完整适配 |

## 实现要求

渠道类型插件需要实现以下接口：

```
POST /adapter/chat/completions
  → 接收 AGW 转发的请求
  → 转换为目标协议
  → 调用上游服务
  → 转换响应为 OpenAI 格式
  → 返回
```

## 请求格式

```json
{
  "request_id": "req_abc123",
  "model": "custom-model",
  "messages": [...],
  "stream": false,
  "channel_id": 5,
  "channel_config": {
    "base_url": "https://custom-api.example.com",
    "api_key": "***"
  }
}
```

## 响应格式

非流式：

```json
{
  "status_code": 200,
  "headers": {"content-type": "application/json"},
  "body": "{"choices": [...]}",
  "usage": {"prompt_tokens": 10, "completion_tokens": 20}
}
```

流式：

```
data: {"choices":[{"delta":{"content":"Hello"},"index":0}]}


data: [DONE]


```

## 注册渠道

管理面板 → 渠道管理 → 添加渠道：

- **适配器**：选择 `custom`
- **自定义处理器**：选择已安装的渠道类型插件
- 其余配置同普通渠道

## 注意事项

- ⚠️ 渠道类型插件是最底层的扩展，出错直接影响请求成功率
- ⚠️ 必须正确处理流式和非流式两种情况
- ⚠️ 超时时间比标准钩子长（默认 120 秒）