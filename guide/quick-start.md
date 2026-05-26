# 快速开始

5 分钟让 AGW 跑起来。

## 环境要求

- Go 1.22+
- （可选）Docker

## 从源码运行

```bash
git clone https://github.com/silestar/AIGateway.git
cd AIGateway
go build -buildvcs=false -o agw ./cmd/agw/
./agw
```

首次运行会在当前目录生成 `.env` 文件和 `data/` 数据库目录。

## 使用 Docker

```bash
git clone https://github.com/silestar/AIGateway.git
cd AIGateway
docker compose up -d
```

## 访问管理面板

启动后打开 `http://localhost:8080`：

```
默认账号：admin
默认密码：环境变量 AGW_ADMIN_PASSWORD 或配置文件中 admin_pass
```

## 第一次使用

1. **创建渠道**：管理面板 → 渠道管理 → 添加渠道 → 填入 API Key
2. **绑定模型**：渠道详情 → 模型管理 → 自动发现
3. **创建消费者**：密钥管理 → 生成新 Key
4. **调用**：`curl http://localhost:8080/v1/chat/completions -H "Authorization: Bearer <your-key>" ...`

## 验证是否就绪

```bash
curl http://localhost:8080/v1/models \
  -H "Authorization: Bearer <your-consumer-key>"
```

返回模型列表即表示配置正确。