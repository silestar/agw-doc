# 插件系统架构

## 为什么选 Sidecar？

AGW 最初考虑过内置插件（编译进主程序），但最终选择了 Sidecar 模式：

| 对比 | 内置插件 | Sidecar |
|------|---------|---------|
| 隔离性 | 差（插件崩溃=系统崩溃） | ✅ 进程隔离 |
| 语言支持 | 只有 Go | ✅ 任何语言 |
| 热插拔 | 需要重启 | ✅ 在线启停 |
| 部署 | 随系统部署 | 独立分发更新 |

## 五大钩子

AGW 在请求处理链条上预埋了 5 个扩展点：

| 钩子 | 触发时机 | 作用 |
|------|---------|------|
| `pre_request` | 认证完成、路由之前 | 拦截/修改请求（内容过滤、参数校验） |
| `post_response` | 上游响应返回后 | 拦截/修改响应（格式转换、脱敏） |
| `account_select` | 账号选择前 | 预过滤候选账号列表 |
| `on_log` | 请求结束、日志写入前 | 异步处理（计费、审计） |
| `connection_decorator` | TLS 连接建立时 | TCP 层代理（TLS 伪装、AGP 代理） |

## 声明式钩子注册（v2.0）

- 插件在 `manifest.json` 中声明自己订阅哪些钩子
- 安装时自动注册到对应钩子的调度链
- **不需要渠道级绑定**，启用即全局生效
- 管理员只能启用/禁用钩子，不能新增钩子

## 钩子调度策略

不同钩子的调度策略不同：

| 钩子 | 调度策略 |
|------|---------|
| `pre_request` / `post_response` | 依次调用，reject 即终止 |
| `account_select` | 依次调用，累计 `exclude_ids` |
| `on_log` | **异步**调用，不等结果 |
| `connection_decorator` | 首个有效 `proxy_addr` 生效 |

## 通信协议

```
主系统 → 插件: POST /hook/<hook_name>
            Authorization: Bearer ***
            Content-Type: application/json
            
插件 → 主系统: { "action": "continue" }  或  { "action": "reject", ... }
```

## 插件权限框架

11 个细粒度权限项，分为三级：

- **低敏感**：`channel_id`、`model_name`、`response_status`、`server_info`、`channel_info`
- **中敏感**：`account_id`、`keys_id`、`request_body_summary`、`response_body_summary`
- **🔴 高敏感**：`request_headers`、`channel_config`（授予需二次确认）

### 两个数据通道的权限过滤

权限覆盖所有数据通道：
- **TriggerHook（HTTP 钩子）**：`filterHookRequest` 根据授权结果置零/置空字段
- **CONNECT 协议（Sidecar 代理）**：根据授权结果决定是否带 `X-AGW-*` 头

## connection_decorator 的特殊性

这是唯一不走标准 HTTP 钩子通信的钩子——它在 **TCP 层面**工作：

```
AGW → 插件: CONNECT api.openai.com:443
插件 → AGW: 200 OK
(双向数据转发开始)
```

插件负责建立隧道（选出口），TLS 握手仍由 AGW 完成。设计原则：**TLS 是 AGW 核心职责，不下沉到插件**。