# Go SDK 参考

AGW 官方提供 Go SDK，简化插件开发。

## 安装

```bash
go get github.com/silestar/agw-plugin-sdk
```

## 快速开始

```go
package main

import (
    "github.com/silestar/agw-plugin-sdk/plugin"
)

func main() {
    p := plugin.New()
    p.OnPreRequest(func(req *plugin.PreRequest) *plugin.Response {
        // 你的逻辑
        return plugin.Continue()
    })
    p.OnPostResponse(func(req *plugin.PostResponse) *plugin.Response {
        return plugin.Continue()
    })
    p.Run()
}
```

## 核心类型

```go
type Plugin struct {
    handlers map[string]HandlerFunc
}
```

## Handler 函数

```go
type PreRequestHandler func(req *PreRequest) *Response
type PostResponseHandler func(req *PostResponse) *Response
type AccountSelectHandler func(req *AccountSelectRequest) *Response
type OnLogHandler func(req *OnLogRequest)
```

## Response 构造函数

```go
plugin.Continue()                          // 继续
plugin.Reject("原因", 403)                 // 拒绝
plugin.Modify(map[string]interface{}{...}) // 修改
plugin.Exclude([]int{7, 12})               // 排除账号（account_select 专用）
```

## 请求类型

### PreRequest

```go
type PreRequest struct {
    RequestID          string
    ModelName          string
    ChannelID          int
    KeysID             int
    RequestBodySummary string
    RequestHeaders     map[string]string
    ChannelInfo        *ChannelInfo
}
```

### PostResponse

```go
type PostResponse struct {
    RequestID           string
    ModelName           string
    ChannelID           int
    ResponseStatus      int
    ResponseBodySummary string
    ResponseHeaders     map[string]string
}
```

### AccountSelect

```go
type AccountSelectRequest struct {
    RequestID         string
    ModelName         string
    ChannelID         int
    KeysID            int
    CandidateAccounts []int
}
```

### OnLog

```go
type OnLogRequest struct {
    RequestID       string
    KeysID          int
    ModelName       string
    ChannelID       int
    AccountID       int
    PromptTokens    int
    CompletionTokens int
    StatusCode      int
    ElapsedMs       int
    RetryChain      []RetryStep
}
```

## 错误处理

```go
func handler(req *plugin.PreRequest) *plugin.Response {
    // 验证 Token 由 SDK 自动处理
    // 你的代码异常被 SDK 捕获，返回 Reject
    if req.ModelName == "" {
        return plugin.Reject("empty model name", 400)
    }
    return plugin.Continue()
}
```

## 完整示例

```go
package main

import (
    "strings"
    "github.com/silestar/agw-plugin-sdk/plugin"
)

func main() {
    p := plugin.New()
    p.OnPreRequest(func(req *plugin.PreRequest) *plugin.Response {
        if strings.Contains(req.RequestBodySummary, "badword") {
            return plugin.Reject("content filtered", 403)
        }
        return plugin.Continue()
    })
    p.Run()
}
```