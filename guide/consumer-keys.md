# 消费者密钥管理

## 消费者 vs API Key

| 概念 | 说明 |
|------|------|
| 消费者 | AGW 中的"用户"概念 |
| API Key | 消费者用来认证的密钥 |
| 关系 | 一个消费者对应一个 API Key |

## 生成消费者

管理面板 → 密钥管理 → 生成密钥

1. 输入名称（如 "张三"、"前端应用"）
2. 选择所属的消费者分组
3. 点击生成 → 复制显示的 Key（**只显示一次**）

Key 格式：`sk-` + 随机字符串（如 `sk-aB3xK7mN9pQ...`）

## 配额设置

在消费者分组中为每个消费者设置：

| 配额 | 说明 |
|------|------|
| RPM | 每分钟最大请求数 |
| TPM | 每分钟最大 Token 数 |

超出配额时返回 `429 Too Many Requests`。

## 吊销密钥

管理面板 → 密钥管理 → 点击吊销

- 密钥立即失效
- 保留历史统计数据（不影响报表）
- 吊销后不可恢复

## 分组绑定

```
消费者分组 → 绑定 → 渠道分组

消费者分组 "内部团队":
  包含消费者：张三、李四
  绑定渠道分组 "default"、"high-priority"
  → 张三和李四可以使用 "default" 和 "high-priority" 分组下的所有渠道
```

## 消费方调用

```bash
curl http://localhost:8080/v1/chat/completions   -H "Content-Type: application/json"   -H "Authorization: Bearer sk-your-key-here"   -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```