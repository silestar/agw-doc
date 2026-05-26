# 打包与分发

## 标准包结构

```
my-plugin/
├── manifest.json        # 必需
├── my-plugin            # 编译后的二进制
├── README.md            # 必需（包含安装说明）
└── Dockerfile           # 可选（Docker 部署）
```

## 编译要求

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o my-plugin
```

- `CGO_ENABLED=0`：静态编译，无 glibc 依赖
- `-ldflags="-s -w"`：去除调试信息，减小体积
- 目标 Linux amd64（与 AGW 运行环境一致）

## Docker 部署

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o my-plugin

FROM alpine:3.19
COPY --from=builder /app/my-plugin /plugin/my-plugin
COPY manifest.json /plugin/
COPY README.md /plugin/
CMD ["/plugin/my-plugin"]
```

## 安装方式

### 方式一：面板上传

1. 管理面板 → 插件管理 → 安装
2. 选择插件目录或上传 `.tar.gz`
3. 系统自动解压、验证 manifest.json
4. 弹出权限确认页
5. 点击安装

### 方式二：命令行

```bash
# 将插件文件放到 plugins/ 目录下
agw plugin install ./my-plugin/

# 列出已安装插件
agw plugin list

# 启用
agw plugin enable my-plugin
```

## 版本管理

- manifest.json 中 `version` 字段遵循语义化版本
- 更新插件时需递增版本号
- 安装新版本时会提示覆盖确认

## 分发渠道

| 渠道 | 说明 |
|------|------|
| 官方插件仓库 | 审核后列入官方目录 |
| GitHub Release | 自行发布，用户下载安装 |
| 内部分发 | 公司内部文件共享 |

## 插件命名规范

- 小写字母 + 连字符：`content-filter`、`billing-hook`
- 与 manifest.json 的 `name` 一致
- 注册后不可修改 `name`

## 检查清单

打包前确认：

- [ ] `manifest.json` 所有必填项完整
- [ ] 二进制在目标平台可执行（`file my-plugin` 确认）
- [ ] `CGO_ENABLED=0` 静态编译
- [ ] `README.md` 包含安装步骤和配置说明
- [ ] 版本号已递增
- [ ] 已通过本地测试