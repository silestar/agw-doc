# 快速上手

10 分钟写出你的第一个 AGW 插件。

## 前置准备

- Go 1.22+
- 一个文本编辑器

## Step 1：创建目录

```bash
mkdir hello-agw && cd hello-agw
go mod init hello-agw
```

## Step 2：创建 manifest.json

```json
{
  "name": "hello-agw",
  "version": "1.0.0",
  "description": "我的第一个 AGW 插件",
  "author": "your-name",
  "hooks": ["pre_request"],
  "permissions": {
    "pre_request": ["model_name", "request_body_summary"]
  }
}
```

## Step 3：写插件代码

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
)

type HookRequest struct {
    Hook      string `json:"hook"`
    RequestID string `json:"request_id"`
    Data      map[string]interface{} `json:"data"`
}

type HookResponse struct {
    Action  string `json:"action"`
    Message string `json:"message"`
}

var authToken = os.Getenv("PLUGIN_AUTH_TOKEN")

func main() {
    port := os.Getenv("PLUGIN_PORT")
    http.HandleFunc("/hook/pre_request", preRequestHandler)
    http.HandleFunc("/health", healthHandler)
    log.Printf("Hello AGW plugin listening on :%s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}

func preRequestHandler(w http.ResponseWriter, r *http.Request) {
    // 验证 Token
    if r.Header.Get("Authorization") != "Bearer "+authToken {
        w.WriteHeader(401)
        return
    }

    var req HookRequest
    json.NewDecoder(r.Body).Decode(&req)

    modelName := req.Data["model_name"].(string)
    body := req.Data["request_body_summary"].(string)
    log.Printf("收到请求: model=%s body=%s", modelName, body)

    // 返回 continue，不做拦截
    resp := HookResponse{Action: "continue", Message: "ok"}
    json.NewEncoder(w).Encode(resp)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(200)
    w.Write([]byte(`{"status":"ok"}`))
}
```

## Step 4：编译

```bash
CGO_ENABLED=0 go build -ldflags="-s -w" -o hello-agw
```

## Step 5：安装到 AGW

1. 把 `hello-agw` 二进制和 `manifest.json` 放到插件目录
2. AGW 管理面板 → 插件管理 → 安装
3. 选择插件路径
4. 授予权限（model_name + request_body_summary）
5. 启用 `pre_request` 钩子

## Step 6：验证

发起一次对话请求，查看插件日志：

```bash
# AGW 收集的插件日志
curl http://localhost:8080/api/plugins/<id>/logs
```

## 接下来

- 阅读 [通信协议](./communication) 了解完整的请求响应格式
- 阅读 [五大钩子详解](#) 了解所有钩子
- 阅读 [权限框架](./permission-framework) 声明正确的权限