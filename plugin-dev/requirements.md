# 插件开发规范与要求

## 🔒 1. 安全

| 要求 | 说明 |
|------|------|
| Token 验证 | 所有端点必须验证 `Authorization: Bearer <token>` |
| 只监听 127.0.0.1 | 不允许监听公网接口 |
| 不持久化敏感数据 | API Key、Token 不写入本地文件 |
| 不使用 eval/exec | 不执行来自请求体的代码 |
| manifest.json 完整性 | `name` 不可在该插件后续版本中修改 |

## ⚡ 2. 性能

| 要求 | 说明 |
|------|------|
| 同步钩子 ≤ 5s | `pre_request` 等同步钩子必须在此时间内返回 |
| 异步钩子尽快返回 | `on_log` 接收后立即返回 200，后台处理 |
| 内存 ≤ 128MB | 单个插件推荐内存上限 |
| 无阻塞 IO | 同步钩子中避免调用外部 API |

## 🔧 3. 编译

| 项目 | 要求 |
|------|------|
| Go 版本 | ≥1.22 |
| 编译模式 | `CGO_ENABLED=0` 静态编译 |
| 二进制大小 | ≤50MB（推荐 ≤20MB） |
| 依赖最小化 | 避免引入不必要的第三方库 |

```bash
# Go 静态编译示例
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o plugin
```

## 📋 4. manifest.json

| 字段 | 要求 |
|------|------|
| `name` | 必填，注册后不可修改 |
| `version` | 必填，语义化版本 |
| `hooks` | 必填，至少声明一个钩子 |
| `permissions` | 必填，最小权限原则 |

## 📊 5. 日志

- 统一输出到 `stdout`（AGW 收集）
- 使用 JSON 格式：
  ```json
  {"level":"info","msg":"hook called","hook":"pre_request","request_id":"req_abc123"}
  ```
- 不要输出 API Key 或 Token 到日志

## 🧪 6. 测试

- 本地测试方案：启动独立 HTTP Server + curl 模拟 AGW 调用
- 提供至少一个端到端测试用例
- 异常场景覆盖：Token 错误、超时、格式错误

## 📝 7. 文档

每个插件包必须包含 `README.md`：

```markdown
# 插件名称

## 功能说明
简要描述插件做什么

## 钩子
- pre_request：做什么

## 权限声明
- request_body_summary：为什么需要

## 配置说明
| 参数 | 类型 | 默认值 | 说明 |

## 安装
复制文件 + Docker 部署命令

## 测试
本地验证步骤
```