# 账号池核心逻辑

## 一句话描述

一个渠道绑定多个上游 API Key，AGW 自动管理这些账号的优先级、复用和故障恢复。

## 数据结构

```
account:
  channel_id      → 所属渠道
  api_key         → 上游 API Key（AES-256-GCM 加密存储）
  priority        → 优先级（越大越优先）
  status          → active | disabled | cooling
  probe_block_until → 冷却期结束时间
  consecutive_downtimes → 连续故障次数
```

## 选择算法

```
1. 按 priority 从高到低排序
2. 过滤出 status=active 的账号
3. 检查是否有粘性绑定（同一 key+model 上次用的账号）
   → 有且仍 active → 直接复用
   → 没有或已 disabled → 进入下一步
4. 选 priority 最高的 active 账号
```

## 冷却等级

| 等级 | 冷却时间 | 适用场景 |
|------|---------|---------|
| 一级冷却 | `probe_cooldown_duration`（默认 7200s） | 首次故障 |
| 二级冷却 | `probe_cooldown_duration_l2`（默认 86400s） | 连续故障升级 |

## 故障计数与状态转换

```
状态转换图:

active ──── 故障触发 ────→ disabled
  ↑                          │
  │                          ↓
  └── 探测成功 ←── cooling ──┘
                 │
                 └── 再次故障 → 延长冷却 / disabled
```

每个账号维护 `consecutive_downtimes` 计数器：
- 故障 → +1
- 连续 N 次（可配）→ 进入 L2 冷却
- 探测成功 → 重置为 0

## 请求基础（Request Basis）

一个重要的设计细节：**状态变更只在请求结束后评估。**

- 非流式请求：在一个 Forward 周期结束后才 ReportResult
- 流式请求：在 Reader 被关闭后才 AssessFailure
- `context.Canceled` 的错误**不计入失败**（客户端主动取消）

## 全局加密

所有上游 API Key 使用系统级 AES-256-GCM 加密。密钥在首次启动时自动生成并写入 `.env` 文件，后续重启从 `.env` 加载。