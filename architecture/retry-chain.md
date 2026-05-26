# 故障转移与重试链路

## 重试层级

当请求失败时，AGW 不会立即返回错误，而是按层级递进重试：

```
单账号重试(stream: 可配次数)
  → 同渠道切换账号
  → 同分组切换渠道
  → 返回错误
```

每层尝试都遵循路由规则（权重、模型存在性过滤）。

## 重试链记录

每次重试都被记录在 `retry_chain` JSON 字段中：

```json
[
  {"channel_id": 5, "account_id": 12, "error": "connection refused"},
  {"channel_id": 5, "account_id": 15, "error": "429 too many requests"},
  {"channel_id": 3, "account_id": 8,  "status": "success"}
]
```

这让每次请求的完整故障转移路径一目了然。

## 🔥 经典案例：499 三重死锁

这是 AGW 历史上最严重的生产事故（持续 42 分钟），也催生了最核心的架构改进。

### 故障时间线

```
17:35 — 上游返回 499（客户端断开）
17:35 — AGW 因为 statusCode=0 不计数、不禁用、不清粘性
17:35-18:17 — 42 分钟内所有请求死磕同一个故障账号
18:17 — 管理员重启容器恢复

根因：三个缺陷叠加形成死锁闭环
```

### 三重死锁分析

1. **`ReportResult` 不处理 499**：statusCode=0 时 `isFailureCountable(0)` 返回 false → 直接 return，不计数、不禁用
2. **粘性命中不验证状态**：`SelectAccount` 从内存缓存拿粘性账号，即使账号已在 DB 中 disabled
3. **跨请求无保护**：`RerouteAfterFailure` 只在当前请求重试周期内有效

### 修复

- 非流式 Forward 失败时，从错误消息中提取真实 statusCode（而非永远传 0）
- 粘性命中后加 `WHERE status='active'` 验证
- `isFailureCountable` 返回 false 时也清除粘性
- 默认 `channel_disable_status_codes` 新增 499

## 流式请求的特殊处理

| 场景 | 处理 |
|------|------|
| 已发送数据后客户端断开 | 日志 statusCode=200，不触发降级 |
| 未发送数据即断开 | 日志 statusCode=499，触发故障降级 |
| context.Canceled | 完全不计入失败（客户端主动取消） |
| context.DeadlineExceeded | 不计入账号失败，但触发渠道级熔断 |

## context 错误区分

这是容易踩坑的地方。同样是 `context error`，来源不同处理不同：

- `context.Canceled` = 客户端主动断开 → 不计入失败
- `context.DeadlineExceeded` = 上游超时 → 不罚单账号，但触发渠道级快速降级

区分处理避免了"一个账号慢就反复重试同一个账号"的问题。