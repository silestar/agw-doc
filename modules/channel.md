# 渠道与分组管理

## 渠道模型

一个**渠道**代表一个上游 AI 服务商的一个接入点：

```
channel:
  name            → 显示名称（如 "OpenAI-Pro"）
  adapter         → 使用的适配器类型（openai/anthropic/gemini/custom）
  base_url        → API 端点
  endpoint        → 具体路径（如 /v1/chat/completions）
  weight          → 该渠道在分组内的权重
```

## 适配器体系

每个渠道绑定一个适配器，负责协议双向转换：

| 适配器 | 支持模型 |
|--------|---------|
| OpenAI | gpt-*、o1 系列、deepseek 等兼容格式 |
| Anthropic | claude-* 系列 |
| Gemini | gemini-* 系列 |
| OpenAI Responses | o1 系列 Responses API |
| Custom | 自建/第三方兼容 OpenAI 格式的服务 |

## 渠道分组

渠道分组是路由的基本单位：

```
渠道分组:
  包含多个渠道（按权重分配流量）
  绑定到消费者分组（权限控制）
```

## 模型自动发现

渠道创建后，AGW 支持从上游自动拉取支持的模型列表：

```
调用上游 /v1/models → 解析返回列表
  → 存入 channel_models 表
  → 自动生成 display_name（用户可见名称）
  → 手动审核/编辑后激活
```

### 映射逻辑

- 一个上游模型名可映射为多个 `display_name`
- 多个上游模型可映射到同一个 `display_name`（聚合）
- `is_hidden` 标记控制对消费者可见性

## 配置精简

批量导入映射功能：粘贴一列模型名，系统自动去重，为每个模型创建映射条目。