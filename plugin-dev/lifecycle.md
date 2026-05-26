# 插件生命周期

## 状态机

```
          register
            │
            ▼
    ┌─── validating ──→ error ──→ (死亡)
    │        │
    │    验证通过
    │        │
    │        ▼
    │     loaded ──→ enable ──→ running
    │                            │    │
    │                   disable ←┘    │ 崩溃
    │                            │    │
    │                            ▼    ▼
    │                         stopped (自动重启)
    │                            │
    │                    unregister
    │                            │
    └────────────────────────────┘
```

## 各阶段说明

| 阶段 | 触发 | 行动 |
|------|------|------|
| `register` | 管理员创建插件 | 生成 Token、分配端口、写入 DB |
| `validating` | 注册后 | 启动进程、健康检查、加载 manifest |
| `loaded` | 验证通过 | 等待启用 |
| `running` | `enable` | 接收钩子调用 |
| `stopped` | `disable` 或崩溃 | 停止接收钩子调用，不接收新请求 |
| `unregister` | 卸载 | 删除 DB 记录和文件 |

## 崩溃自动恢复

```
running → 进程崩溃 → stopped
  → 检查重启次数是否超限
  → 未超限：5 秒后自动重启 → validating → loaded → enable → running
  → 超限：保持 stopped，管理员手动 Intervention
```

## 环境变量

AGW 在启动插件时注入以下环境变量：

| 变量 | 说明 |
|------|------|
| `PLUGIN_AUTH_TOKEN` | 用于验证 AGW 调用 |
| `PLUGIN_PORT` | 插件需要监听的端口 |
| `PLUGIN_NAME` | 插件名称 |
| `PLUGIN_ID` | 插件唯一 ID |

## 健康检查

AGW 定期（30 秒）对运行中的插件执行健康检查：

```
GET /health → 200 OK → 正常
GET /health → 超时/非200 → 计数+1 → 连续3次失败 → 自动重启
```