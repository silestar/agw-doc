# connection_decorator 钩子

## 特殊之处

这是所有钩子中最特殊的一个——它不在 HTTP 层工作，而是在 **TCP 连接层**。

## 触发时机

AGW 与上游 AI 服务建立 TLS 连接时，先通过插件建立隧道。

## 工作原理

```
AGW                   插件                  上游
 │                    │                     │
 │── CONNECT 请求 ───→│                     │
 │                     │── 建立连接 ────────→│
 │←── 200 OK ─────────│                     │
 │                     │                     │
 │═══ 双向数据流 ═══════════════════════════│
 │   (TLS 由 AGW 完成)                       │
```

## 应用场景

| 场景 | 说明 |
|------|------|
| **AGP 代理** | 通过代理池节点发请求，隐藏真实 IP |
| **TLS 伪装** | 修改 SNI 等 TLS 参数 |
| **自定义出口** | 选择特定网络出口 |

## 请求 payload

```
CONNECT api.openai.com:443 HTTP/1.1
Host: api.openai.com
X-AGW-Account-ID: 15
X-AGW-Channel-ID: 5
X-AGW-Keys-ID: 12
X-AGP-Sticky-Key: user_12_gpt4
```

## 响应

```
HTTP/1.1 200 OK

(随后双向转发原始 TCP 流)
```

## 唯一性

多个插件订阅 `connection_decorator` 时，**只有第一个插件生效**（不是依次调用）。

## AGP 插件示例

AGP 插件是最典型的实现：

1. 接收 `CONNECT` 请求
2. 根据 `X-AGP-Sticky-Key` 选择代理节点
3. 与 mihomo 建立 SOCKS5/HTTP 隧道
4. 返回 `200 OK`
5. 开始透明转发

## 注意事项

- ⚠️ 这个钩子不走标准 HTTP JSON 通信，而是原始 TCP
- ⚠️ **只有第一个订阅的插件生效**
- ⚠️ TLS 握手仍由 AGW 完成，插件只负责搭建隧道
- ⚠️ 权限由 `X-AGW-*` 头控制（详见权限框架）