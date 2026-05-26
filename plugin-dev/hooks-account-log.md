# account_select / on_log 钩子

## account_select

**触发时机**：账号池选择最佳账号之前。

**用途场景**：
- 自定义账号过滤（排除特定区域/类型的账号）
- 注入自定义选择逻辑
- 基于请求内容的路由

**请求 payload**：

```json
{
  "hook": "account_select",
  "data": {
    "model_name": "gpt-4",
    "channel_id": 5,
    "keys_id": 12,
    "candidate_accounts": [3, 7, 12, 15]
  }
}
```

**响应预期**：

```json
{
  "action": "continue",
  "data": {
    "exclude_ids": [7, 12],
    "preferred_id": 3
  }
}
```

**调度策略**：同步依次调用，累计所有插件的 `exclude_ids`，最后在候选列表中移除被排除的 ID，优先尝试 `preferred_id`。

---

## on_log

**触发时机**：请求完全结束，日志写入之前（非流式）/ 流关闭后（流式）。

**用途场景**：
- 异步审计（记录完整请求-响应对）
- 计费集成（上报用量到外部系统）
- 自定义统计
- 异常告警

**请求 payload**：

```json
{
  "hook": "on_log",
  "data": {
    "request_id": "req_abc123",
    "keys_id": 12,
    "model_name": "gpt-4",
    "channel_id": 5,
    "account_id": 15,
    "prompt_tokens": 120,
    "completion_tokens": 450,
    "status_code": 200,
    "elapsed_ms": 2340,
    "retry_chain": [
      {"channel_id": 5, "account_id": 7, "error": "429"},
      {"channel_id": 5, "account_id": 15, "status": "success"}
    ]
  }
}
```

**响应预期**：AGW **不等待**此钩子的响应（异步调用）。

---

## 实现要点

### account_select 示例

```go
func AccountSelectHandler(w http.ResponseWriter, r *http.Request) {
    var req HookRequest
    json.NewDecoder(r.Body).Decode(&req)

    excludeIDs := []int{}
    for _, id := range req.Data.CandidateAccounts {
        if shouldExclude(id) {
            excludeIDs = append(excludeIDs, id)
        }
    }

    respond(w, ActionContinue, map[string]interface{}{
        "exclude_ids": excludeIDs,
    })
}
```

### on_log 示例

```go
func OnLogHandler(w http.ResponseWriter, r *http.Request) {
    var req HookRequest
    json.NewDecoder(r.Body).Decode(&req)

    // 异步处理，不阻塞
    go reportToBilling(req.Data)

    w.WriteHeader(200)
    w.Write([]byte(`{"status":"received"}`))
}
```

## 注意事项

- ⚠️ `on_log` 是异步的，AGW 不等待响应，你的实现也需要尽快返回
- ⚠️ `account_select` 的 `exclude_ids` 是累积的——如果所有账号都被排除，请求会失败