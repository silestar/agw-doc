# 模型自动发现与映射

## 设计动机

管理上游渠道的模型列表是个体力活。AGW 的自动发现让你**创建渠道后一键同步模型**。

## 自动发现流程

```
创建渠道 → 触发自动发现
  → 调用上游 GET /v1/models（带渠道 API Key）
  → 解析返回的模型列表
  → 存入 channel_models 表（status=inactive）
  → 管理面板展示待审核列表
  → 管理员审核/编辑 → 激活
```

也可通过手动触发、定时任务触发模型同步。

## 数据模型

```
channel_models:
  channel_id         ← 所属渠道
  upstream_model_id  ← 上游返回的原始模型名
  display_model_name ← 对外展示的名称
  is_hidden           ← 是否对消费者隐藏
  status              ← active | inactive | error
  updated_at          ← 最后同步时间
```

## 映射规则

- **一对一**：上游 `gpt-4` → 展示 `GPT-4`（最常见）
- **一对多**：上游 `gpt-4-vision-preview` → 同时展示 `GPT-4 Vision` 和 `gpt-4-vision`
- **多对一**：上游 `claude-3-opus-20240229` 和 `claude-3-opus` → 都展示为 `Claude 3 Opus`
- **隐藏模型**：`is_hidden=true` 的模型消费者看不到，通常用于已废弃或调试用模型

## 批量导入

管理面板支持粘贴一列模型名自动导入映射：

```
输入：
gpt-4
gpt-4-turbo
gpt-3.5-turbo

系统自动：
  → 去重
  → 创建 channel_models 条目
  → 设定默认 display_model_name
  → 标记 status=active
```

## 与路由的关系

路由时通过 `channel_models` 表做模型存在性过滤：

```sql
SELECT * FROM channel_models 
WHERE channel_id = ? AND display_model_name = ? AND status = 'active'
```

如果某渠道没有对应模型，路由自动跳过该渠道，不会出现"选了渠道才知道不支持该模型"的尴尬。