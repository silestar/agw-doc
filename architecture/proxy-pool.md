# AGP 代理池集成

## AGP 是什么？

AGP（AGW Edge Proxy）是一个独立的代理节点管理系统，负责管理和调度多个代理出口节点。

## 与 AGW 的关系

```
客户端
  ↓
AGW (主系统)
  ↓ connection_decorator 钩子
AGP Proxy 插件
  ↓ HTTP 代理请求
mihomo 代理节点
  ↓ SOCKS5/HTTP
上游 AI 服务
```

## 为什么需要代理池？

- **避免 IP 限流**：多个账号从同一 IP 请求容易被上游识别和限制
- **地域路由**：某些上游对特定地域 IP 有更好的速度/价格
- **账号隔离**：不同账号走不同出口节点，避免关联

## 代理链路

1. AGW 确定需要走代理的账号
2. 触发 `connection_decorator` 钩子
3. AGP 插件收到 CONNECT 请求（含 `X-AGW-Account-ID` 等头）
4. AGP 根据 StickyKey 选择或分配代理节点
5. 通过 mihomo 建立 SOCKS5/HTTP 隧道
6. AGW 在隧道上完成 TLS 握手
7. 双向数据转发

## 节点选择

> **AGP 是大脑，mihomo 只是执行工具。**

- 节点选择权 100% 归 AGP 控制
- AGP 通过 `PUT /proxies/{group}` API 切节点
- mihomo 仅作连接执行端，不参与决策
- 即使没有 StickyKey，AGP 也必须自己选节点（随机/轮询健康节点）

## 粘性绑定

`X-AGP-Sticky-Key` 机制确保同一会话复用同一代理节点：
- StickyKey 由 AGP 插件根据 `account_id` 或自定义规则生成
- 同一 StickyKey 的后续请求走同一个出口节点
- 节点不可用时自动重新分配

## 权限传递

CONNECT 协议中通过自定义头部传递权限信息：
- `X-AGW-Account-ID`：当前使用的账号 ID
- `X-AGW-Channel-ID`：当前使用的渠道 ID
- `X-AGW-Keys-ID`：消费方密钥 ID

这些头部由插件权限框架控制，只有获得相应授权的插件才能收到。