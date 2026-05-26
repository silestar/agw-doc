# 部署指南

## Docker Compose（推荐）

```bash
git clone https://github.com/silestar/AIGateway.git
cd AIGateway
docker compose up -d
```

首次启动自动生成 `.env` 文件，包含 SECRET_KEY。

### 环境变量

通过 `docker-compose.yml` 的 `environment` 段或 `.env` 文件注入：

```
AGW_ADMIN_PASSWORD=your-admin-password
AGW_JWT_SECRET=your-jwt-secret
```

## 二进制部署

```bash
go build -buildvcs=false -ldflags="-s -w" -o agw ./cmd/agw/
./agw
```

## 反向代理

AGW 本身是 HTTP 服务，生产环境建议前面加 Nginx/Caddy：

```nginx
server {
    listen 443 ssl;
    server_name agw.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;  # 必须关闭，否则 SSE 失效
    }
}
```

## 数据库

| 数据库 | DSN 格式 |
|--------|---------|
| SQLite（默认） | `data/agw.db` |
| PostgreSQL | `postgres://user:pass@host:5432/agw?sslmode=disable` |
| MySQL | `user:pass@tcp(host:3306)/agw?charset=utf8mb4&parseTime=True` |

建议先用 SQLite 跑通，生产环境切换到 PostgreSQL。

## 数据持久化

Docker 部署时确保挂载：

```yaml
volumes:
  - ./data:/app/data      # SQLite 数据库
  - ./logs:/app/logs      # 日志归档
  - ./.env:/app/.env      # 密钥和密码
  - ./config.yaml:/app/config.yaml  # 主配置
```

## 健康检查

```bash
curl http://localhost:8080/health
# → {"status":"ok"}
```

## 升级

1. 拉取新版本：`git pull`
2. 重新构建：`docker compose build`
3. 重启：`docker compose up -d`
4. 检查日志：`docker compose logs -f`