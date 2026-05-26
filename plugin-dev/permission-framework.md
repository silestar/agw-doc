# 插件权限框架

## 设计目标

不同钩子需要访问不同敏感级别的数据。权限框架让你声明"我需要什么数据"，管理员审核后授予。

## 三级权限

| 级别 | 权限项 | 敏感性 |
|------|--------|--------|
| 🔵 低敏感 | `channel_id`、`model_name`、`response_status`、`server_info`、`channel_info` | 基本无风险 |
| 🟡 中敏感 | `account_id`、`keys_id`、`request_body_summary`、`response_body_summary` | 涉及用户数据 |
| 🔴 高敏感 | `request_headers`、`channel_config` | 可能泄露上游凭证 |

## 在 manifest.json 中声明

```json
{
  "permissions": {
    "pre_request": ["model_name", "channel_id", "request_body_summary"],
    "post_response": ["response_status", "response_body_summary"]
  }
}
```

## 两个数据通道

权限框架覆盖**所有**数据通道：

### TriggerHook 通道（HTTP 钩子）

`filterHookRequest` 根据授权结果过滤：
- 授予的字段 → 正常传值
- 未授予的字段 → 置零/置空

```json
// 插件只声明了 model_name 和 request_body_summary
// 实际传给它的 payload 中：
{
  "model_name": "gpt-4",           // ✅ 已授予
  "request_body_summary": "...",   // ✅ 已授予
  "channel_id": 0,                 // ❌ 未授予，置零
  "request_headers": {}            // ❌ 未授予，置空
}
```

### CONNECT 通道（Sidecar 代理）

根据插件对 `channel_config` 和 `request_headers` 的授权，决定是否传递自定义头：

```
未授权 channel_config → 不带 X-AGW-Channel-ID
已授权 channel_config → 带 X-AGW-Channel-ID: 5
```

## 高敏感权限

`request_headers` 和 `channel_config` 在管理面板授予时**需二次确认**：

> ⚠️ 授予 `request_headers` 权限意味着插件可以看到原始请求头（可能包含用户 IP、User-Agent 等）。请确认该插件是可信的。

## 管理面板授权流程

```
插件列表 → 选择插件 → 权限标签页
  → 查看已声明权限
  → 逐项勾选/取消
  → 高敏感项弹出二次确认
  → 保存变更（即时生效，无需重启）
```

## 最佳实践

- 🔒 **最小权限原则**：只声明必需的权限
- 🛡️ 避免声明 `request_headers` 除非绝对必要
- 📝 在 README 中解释为什么需要每个权限