# pre_request / post_response 钩子

## pre_request

**触发时机**：消费者认证完成，分组路由开始之前。

**用途场景**：
- 内容安全过滤（拦截不安全 prompt）
- 参数校验（拒绝超长请求）
- 请求修改（自动补全 system prompt）
- 注入自定义路由逻辑

**请求 payload**：

```json
{
  "hook": "pre_request",
  "data": {
    "model_name": "gpt-4",
    "channel_id": 5,
    "keys_id": 12,
    "request_body_summary": "What is...",
    "request_headers": {"content-type": "application/json"},
    "channel_info": {"adapter": "openai", "base_url": "https://..."}
  }
}
```

**响应预期**：
- `continue`：正常流转
- `reject`：返回错误给调用方
- `modify`：修改请求体或 header

**调度策略**：同步依次调用（有序），任意一个 reject 即终止。

---

## post_response

**触发时机**：上游响应返回后，发送给客户端之前。

**用途场景**：
- 响应内容审核
- 格式转换
- 脱敏处理
- 自定义注入（水印、引用）

**请求 payload**：

```json
{
  "hook": "post_response",
  "data": {
    "model_name": "gpt-4",
    "channel_id": 5,
    "response_status": 200,
    "response_body_summary": "The answer is...",
    "response_headers": {"content-type": "application/json"}
  }
}
```

**响应预期**：
- `continue`：原样返回
- `reject`：丢弃响应
- `modify`：替换响应体

**调度策略**：同步依次调用（有序），任意一个 reject 即终止。

## 实现要点

```go
// Go SDK 示例
func HookHandler(w http.ResponseWriter, r *http.Request) {
    // 1. 验证 Token
    // 2. 解析请求
    // 3. 执行过滤逻辑
    // 4. 返回 action
    respond(w, ActionContinue, "ok")
}

func main() {
    http.HandleFunc("/hook/pre_request", HookHandler)
    http.HandleFunc("/hook/post_response", HookHandler)
    http.ListenAndServe(":8080", nil)
}
```

## 注意事项

- ⚠️ 超时 5 秒，不能做耗时操作（如外部 API 调用应异步）
- ⚠️ `reject` 会直接阻断请求，确保只在必要时使用
- ⚠️ `modify` 返回的数据会**覆盖**原始数据，注意保留必要字段