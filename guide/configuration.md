# 配置说明

## 配置文件

AGW 使用 `config.yaml` 管理配置，启动时在当前目录查找。

```yaml
# ===== 服务器 =====
server:
  port: 8080           # 监听端口
  host: "0.0.0.0"      # 监听地址

# ===== 数据库 =====
database:
  driver: "sqlite"      # sqlite | postgresql | mysql
  dsn: "data/agw.db"   # 连接字符串

# ===== Redis（可选）=====
redis:
  enabled: false
  addr: "localhost:6379"
  password: ""
  db: 0

# ===== 日志 =====
log:
  level: "info"         # debug | info | warn | error
  dir: "logs/"          # 日志归档目录
  request_log: true     # 是否记录请求日志
  daily_stats: false    # 是否生成每日统计

# ===== 管理面板 =====
admin:
  user: "admin"
  pass: "***"           # 首次启动随机生成，写入 .env
  jwt_secret: "***"     # JWT 签名密钥

# ===== 账号管理 =====
account_manager:
  affinity_ttl: 3600              # 粘性绑定有效期（秒）
  probe_cooldown_duration: 7200   # 一级冷却时间（秒）
  probe_cooldown_duration_l2: 86400  # 二级冷却时间（秒）
  max_consecutive_downtimes: 3    # 进入 L2 冷却的连续故障阈值

# ===== 安全 =====
security:
  channel_disable_status_codes: [401, 403, 429, 499]

# ===== 插件 =====
plugin:
  enabled: true
  timeout: 5            # 插件调用超时（秒）
  max_restarts: 3       # 5 分钟内最大重启次数
```

## 环境变量

敏感配置通过 `.env` 文件注入（不写入 config.yaml）：

```env
SECRET_KEY=自动生成的 AES 密钥
AGW_ADMIN_PASSWORD=管理员密码
AGW_JWT_SECRET=JWT 签名密钥
AGW_REDIS_PASSWORD=Redis 密码
```

## 配置优先级

```
config.yaml 有值的 key 直接生效
.env 环境变量仅在 config.yaml 缺失时作为后备
```

**注意**：`config.yaml` 中 `redis.enabled: false` 会让 `.env` 中 `AGW_REDIS_ENABLED=true` **无效**。需要启用请直接在 config.yaml 中设置。