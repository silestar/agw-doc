# Changelog

## [0.3.3] — 2026-05-25

> **监控与故障恢复机制全面整改第一轮** — 从问题排查到底层冷却逻辑修复 + Settings/SystemMonitor 配置整合。

### 问题排查与修复

- **修复生产数据库 `malformed` 导致消费日志 500** — 宿主机 dump → rebuild → 替换容器内 agw.db，丢失率 0.47%。
- **429 被动熔断缺少冷却时间** — 上游返回 429 时禁用账号未设 `probe_cooldown_until`，导致系统立即尝试探测恢复。现加设一级冷却时间。
- **L2 冷却从未触发** — `consecutive_cooldown_cycles` 始终为 1，`incrementCooldownCycles` 改为原子递增 `cycles+1`，超过 1 次循环自动进入 L2 冷却。
- **无可用账号渠道仍在重试链中出现** — `Route` 方法遍历前新增 `CountActiveAccountsByChannels` 批量查询，count=0 的渠道静默跳过，减少无效 `no available account` 报错。

### 前端改进

- **账号列表新增诊断列** — 冷却剩余时间、连续失败/阈值、最后禁用时间三列，便于定位故障账号。
- **Settings / SystemMonitor 配置整合** — 原 SystemMonitor 的 9 个账号管理器配置项迁入 Settings 页面，SystemMonitor 改为只读占位（后续迭代完善为实时监控面板）。`channel_retry_status_codes` 增加「尚未实现」黄色标签。
- **SystemMonitor 监控面板** — 占位页升级为完整只读监控面板：
  - 新增 `GET /api/system/monitor/channel-health` API，返回渠道健康快照（可用率/账号分布/冷却等级/上次探测时间）+ 冷却账号明细
  - 前端健康卡片：可用率进度条、活跃/禁用/冷却账号数、冷却等级标签、上次探测时间
  - 前端冷却账号表：渠道、冷却等级、冷却周期、连续失败、冷却截至时间
  - `NewSystemHandler` 注入 `*gorm.DB` 以支持直接 SQL 聚合查询

### 未落地

- **渠道级熔断降级（P2）** — 生产 Redis 未启用，暂不可用。等 Redis 部署后激活。

### 变更文件

```
internal/account/manager.go     | 23 ++-
internal/account/probe.go       | 16 +-
internal/account/types.go       |  3 +
internal/channel/types.go       |  1 +
internal/group/router.go        |  6 +
web/locales/en-US.json          | 75 +++++--
web/locales/zh-CN.json          | 75 +++++--
web/src/api/account.ts          |  5 +
web/src/views/Channels.vue      | 39 ++++
web/src/views/Settings.vue      | 151 +++++++-
web/src/views/SystemMonitor.vue | 334 +------------------------
11 files changed, 369 insertions(+), 359 deletions(-)
```

## [0.3.2] - 2026-05-25

### 新增

#### 系统缓存一键清除功能
- **需求背景**：系统运行久了，内存缓存（账号粘性绑定、状态缓存、速率计数等）可能变脏，引发故障转移失效等异常。之前只能重启容器来清除缓存
- **功能**：
  - 后端：`Cache` 接口新增 `FlushAll()` 方法，`memoryCache` 实现全量清空
  - 后端：`AccountManager` 接口新增 `FlushAllCache()`，`Manager` 实现（含 Warn 级别日志记录）
  - 后端：`SystemHandler` 新增 `POST /api/system/cache/flush` 端点，需管理员鉴权
  - 前端：顶栏退出登录按钮前新增 🧹「清缓存」按钮，点击弹二次确认对话框后调用 API
  - i18n：中英文双语支持

### 修复

#### 重启后插件状态不一致：DB 显示 running 但进程已死
- **问题**：AGW 重启/重新编译后，插件进程随容器一起被杀死，但 DB 中 `status` 仍为 `running`。`loadFromDB` 只从 DB 加载条目到内存注册表，不验证进程是否真的活着，导致前端显示"运行中"但插件功能实际失效，给管理员造成错觉
- **修复**：
  - `internal/plugin/manager.go`：新增 `recoverRunningPlugins()` 方法 — 启动时遍历所有 `status='running'` 的插件，通过 `Signal(0)`（而非 `os.FindProcess` 的假阳性检查）验证进程存活；已死的自动清理残留状态并调用 `Start()` 重新启动
  - `NewManager()`：`loadFromDB` 之后用 `go recoverRunningPlugins()` 异步触发恢复，不阻塞初始化
- **附带修复**：`Stop()` 和 `cmd.Wait()` goroutine（进程意外退出）中补 `registry.remove()` 清理内存注册表，解决 Stop/崩溃后内存残留问题

#### 上游 499 错误下故障转移三重死锁（P0 — 生产事故，持续 42 分钟）
- **故障时间**：2026-05-24 17:35 ~ 18:17
- **现象**：上游返回 499 后，账号切换和渠道降级双重保护全部失效，持续 42 分钟死磕同一故障账号，手动调整优先级/禁用账号均无效，重启容器才恢复
- **根因**：三个缺陷叠加形成死锁闭环
  1. `ReportResult` 对 499（statusCode=0）完全不处理 — `isFailureCountable(0)` 返回 false 直接 `return nil`，不计数、不禁用、不清粘性
  2. `SelectAccount` 粘性命中后只查内存缓存不验证 DB 实际 status，已禁用账号仍可通过粘性返回
  3. 跨请求之间无保护 — `RerouteAfterFailure` 只在当前请求重试周期内有效
- **修复**（`cmd/agw/main.go` / `internal/account/manager.go` / `internal/config/config.go`）：
  - **主因修复**：`main.go` 非流式 Forward 失败时，调用已有的 `extractStatusCode(err)` 从 `"upstream returned NNN:"` 消息中提取状态码传入 `ReportResult`，避免永远传入 0
  - **粘性锁死修复**：`SelectAccount` 粘性命中后改为 `WHERE id = ? AND status = 'active'` 查 DB 验证，已禁用账号自动清除粘性走优先级选择
  - **兜底保护**：`isFailureCountable` 返回 false（statusCode < 500 且非 429）时，也加 `clearAccountBindings` 清除粘性，防止"不计入失败但不解绑"的死锁
  - **默认值加固**：`channel_disable_status_codes` 默认值新增 499，配合 statusCode 正确传入后自动触发立即禁用

## [0.3.1] - 2026-05-25

### 修复

#### 仪表盘今日数据重启清零 + health_check 不计入统计（P1）
- **问题一重启清零**：`GetOverview` → `GetRealtime` → 读内存计数器 `m.counters.Snapshot()`，服务重启后计数器为空，即使 DB 有数据仪表盘今日概览也始终为 0
- **问题二测试路径不计入统计**：`IncrementCounters` 过滤 `LogType != "consumption"` 即排除 health_check，且所有统计查询（小时趋势、Top模型/渠道、日聚合等）均只 `log_type = 'consumption'`，导致渠道可用性检测和渠道模型测试不进入任何仪表盘统计
- **修复**：
  - `GetRealtime` 改从 `request_logs` 实时聚合：`WHERE DATE(timestamp) = today AND log_type IN ('consumption','health_check')`，不再读内存计数器
  - `IncrementCounters` 过滤条件从 `!= "consumption"` 改为 `== "probe"`（即 consumption + health_check 均进入计数器，仅 probe 排除）
  - 三个日聚合函数（`aggregateSystemDaily` / `aggregateKeysDaily` / `aggregateChannelDaily`）和七个统计查询（`GetHourlyTrend` / `GetTopModels` / `GetTopChannels` / `GetRecentErrors` / `GetConsumerRealtime`×2 / `GetChannelRealtime`×2）：`log_type = 'consumption'` → `log_type IN ('consumption','health_check')`
  - 共修改 14 处 SQL 过滤条件
  - 更新测试以适配新的 DB 聚合方式

#### 渠道可用性检测/模型测试不走插件代理（P1）
- **问题**：`sendTestRequest()` 用裸 `&http.Client{}` 直连上游，完全绕过了 proxy.Engine 的 DialTLSContext（含 connection_decorator 钩子），导致渠道可用性检测和模型测试均不走代理。这造成同一账号短时间内从不同 IP（代理 IP vs 直连 IP）请求上游，触发异地请求风控
- **修复**：
  - `internal/proxy/engine.go`：新增 `ForwardRaw()` 方法 — 绕过 adapter 层（请求体已由调用者构造好），但复用 `engine.client`（含 DialTLSContext 插件钩子），确保探测请求走插件代理链路
  - `internal/channel/service.go`：`service` struct 新增 `proxyEngine` 字段 + `SetProxyEngine()` + `RawProxyEngine` 接口 + `RawProxyResult` 类型；`sendTestRequest()` 优先走 `proxyEngine.ForwardRaw()`，降级回直连
  - `internal/channel/types.go`：`ChannelService` 接口新增 `SetProxyEngine(engine RawProxyEngine)`
  - `cmd/agw/main.go`：启动时 `channelSvc.SetProxyEngine(proxyEngine)` 注入代理引擎
- **影响范围**：`TestAccount`（探测/巡检）、`TestChannel`（渠道可用性测试）、`BatchTestModels`（批量模型测试）、`TestSingleModel`（单模型测试）全部受益

#### 模型测试弹窗列表展示优化
- **问题**：弹窗中待测试模型列表显示不完整。渠道 5 的 7 个上游模型 + 5 个自定义映射，弹窗仅显示 2+5
- **修复**：`ModelTestDialog.vue` 排序逻辑重写
  - **上部**：从 `channel_models` 取 `actual_model_name` 去重展示（所有已选的上游模型）
  - **下部**：取 `display_model_name != actual_model_name` 的自定义映射名称展示
  - 上部/下部分隔行展示 + 自定义映射带「映射」tag 标识
  - 恢复只依赖 `props.models`（`channel_models` 表数据），不调用上游 API 拉取模型

### 新增
- `internal/proxy/engine.go`：`ProxyConnInfo` 结构体 + `LastProxyInfo()` 方法，DialTLSContext 记录 `upstream_addr` 和 `proxy_addr`
- `pkg/middleware/logger.go`：请求日志新增 `upstream_addr`、`proxy_addr` 字段（从 Gin context 读取）

### 变更
- `cmd/agw/main.go`：Forward / ForwardStream 后读取 `proxyEngine.LastProxyInfo()` 注入 Gin context

#### 测试路径请求日志补全
- **问题**：`BatchTestModels` 和 `TestSingleModel` handler 没有写 `RequestLog`，导致渠道模型测试在请求日志中完全不可见。同时所有测试路径（包括 `TestChannel`）的 `upstream_addr` / `proxy_addr` 字段为空 — 因为 `sendTestRequest` 走 `ForwardRaw` 后没有读取 `LastProxyInfo()`
- **修复**：
  - `internal/channel/service.go`：`RawProxyEngine` 接口新增 `GetProxyInfo() ProxyInfo` 方法；新增 `ProxyInfo` 类型（避免 channel→proxy 循环引用）；`sendTestRequest` 调 `ForwardRaw` 后立即调 `GetProxyInfo()` 填入 `TestResult`；`BatchTestModels` 传递代理信息到结果
  - `internal/proxy/engine.go`：新增 `GetProxyInfo()` 方法，从 `ProxyConnInfo` 转换为 `channel.ProxyInfo`
  - `internal/channel/types.go`：`TestResult` 和 `BatchTestResultItem` 新增 `UpstreamAddr` / `ProxyAddr` 字段
  - `internal/api/channel_handler.go`：`TestChannel` 成功日志补 `UpstreamAddr` / `ProxyAddr`；`BatchTestModels` 和 `TestSingleModel` 新增 `health_check` 日志记录（含 `UpstreamAddr` / `ProxyAddr`）

#### PostgreSQL `strftime` 不兼容修复
- **问题**：`GetHourlyTrend` 硬编码 SQLite `strftime()`，PostgreSQL 报 `function strftime(unknown, timestamp without time zone) does not exist`
- **修复**：`internal/stats/manager.go` — `Manager` 新增 `dbType` 字段，`NewManager` 签名改为 `(db, logger, dbType)`；新增 `hourTruncExpr()` 方法，按方言返回对应的按小时截断表达式：
  - SQLite: `strftime('%Y-%m-%d %H:00', timestamp)`
  - MySQL: `DATE_FORMAT(timestamp, '%Y-%m-%d %H:00')`
  - PostgreSQL: `to_char(date_trunc('hour', timestamp), 'YYYY-MM-DD HH24:00')`
- `cmd/agw/main.go`：调用 `NewManager` 时传入 `cfg.DB.Type`

### 新增

#### 系统日志可读性改进
- **问题**：系统日志列表对非开发人员可读性极差 — `caller` 显示 `storage/logger.go:46`，`msg` 显示 `request`、`context canceled`，普通管理员完全看不懂
- **修复**：
  - 后端 `system_log_handler.go` 新增 `callerToModule()`（13 个模块映射：`storage/` → `存储层`、`proxy/` → `代理引擎` 等）+ `msgToReadable()`（40+ 常见消息映射：`request` → `请求处理`、`context canceled` → `客户端连接中断（请求方主动断开）` 等）
  - 列表返回时自动附加 `module`（中文模块名）+ `message`（中文描述）字段
  - 前端 `SystemLogs.vue`：`caller` 列显示中文模块名（tooltip 显示原始路径），`msg` 列显示中文描述（tooltip 显示原始消息）
  - 新增 `method`（请求方法，带颜色 tag）和 `path`（请求路径）列，非请求日志显示 `-`
  - 详情抽屉保留完整原始 `caller` / `msg` 数据

## [0.3.0] - 2026-05-22

### 数据库迁移工具
- 新增 `scripts/db_migrate/` 数据库迁移工具，支持 SQLite / MySQL / PostgreSQL 互转
- 全自动流程：读表结构 → 方言转译 → 建表 → 复制数据 → 修改配置
- 源数据库只读，任何失败都不修改 AGW 配置
- 新增 `scripts/db_migrate/verify_migration.py` 迁移数据校验工具
- 迁移脚本自动修复 SQLite→PG 的类型问题（JSON 列脏数据清洗、布尔列 0/1 转 boolean）

### 插件架构重大重构：声明式钩子 + 统调度引擎

#### 核心改造：废除 `channel_plugin_settings`
- **背景**：旧架构中插件与渠道通过 `channel_plugin_settings` 表硬绑定，钩子调度完全依赖渠道上下文
- **问题**：插件无法在无渠道上下文中工作，每个渠道需要单独配置插件，运维复杂度随渠道数线性增长
- **改造**：
  - 彻底移除 `channel_plugin_settings` 表、`ChannelPluginSetting` 结构体、`GetConnectionDecoratorAddr` 方法
  - 移除所有关联 API：`GET /api/plugins/:id/channel-configs`、`PUT /api/plugins/:id/channel-configs/:channelId`、`DELETE /api/plugins/:id/channel-configs/:channelId`
  - 移除前端渠道配置面板（`Plugins.vue` 中 `ChannelConfigPanel` 组件）
  - 插件与钩子的绑定改为**声明式自动注册**：安装时根据 `manifest.json` 的 `hooks` 字段自动关联

#### 统一钩子调度引擎
- **新增 `hooks` 表**：系统预埋 5 个钩子（`connection_decorator`、`pre_request`、`post_response`、`account_select`、`on_log`），开发人员写入，管理员只能启用/禁用
- **新增 `hookRegistry`**：`manager.go` 内存中的钩子-插件双向索引，插件启动/停止时动态注册/注销
- **重写 `TriggerHook`**：改为遍历 `hookRegistry` 中该钩子的所有注册插件，按 `priority` 排序依次调用
  - `pre_request` / `post_response`：遇到 `reject` 即终止
  - `account_select`：累计 `exclude_ids`，传递给下游
  - `on_log`：异步调用，不等待响应
  - `connection_decorator`：第一个返回 `proxy_addr` 的插件生效即可

#### `manifest.json` 新字段
- `display_name`：中文展示名（前端卡片标题）
- `tables`：声明式建表需求（`[{name, columns, indexes}]`），安装时自动建表，卸载时可选删除
- `timeout`：插件声明超时（ms），0 则用钩子默认超时
- `params_schema`：钩子参数契约（JSON Schema），用于前端动态表单和运行时校验

#### Plugin 模型新增字段
- `display_name`、`priority`（钩子执行优先级，值越小越先执行）、`has_db`、`tables_created`（安装时建的表名列表）、`timeout`
- `Manifest` 字段（存储完整 `manifest.json` 内容供后续审计和复检）

#### 新增钩子管理 API
- `GET /api/hooks`：列出所有系统钩子，含启用状态、超时、参数契约
- `PUT /api/hooks/:id/enabled`：管理员启用/禁用钩子
- `GET /api/hooks/:name/plugins`：查看某钩子下按优先级排序的已注册插件列表
- `PUT /api/plugins/:id/priority`：调整插件在钩子中的执行优先级
- `GET /api/plugins/:id/tables`：查看插件安装时创建的数据库表名列表
- `GET /api/channels/simple`：返回所有启用渠道的 id+name（仅两个字段，无敏感数据），供插件配置 Tab 选择渠道使用

#### 前端改造
- **新增 `PluginSettings.vue`**（144 行）：独立的钩子管理页面，路由 `/plugins/settings`
  - 左侧钩子列表（名称、类型、状态开关、已注册插件数）
  - 右侧已注册插件列表（名称、优先级可调、状态、版本）
- **重构 `Plugins.vue`**：移除渠道配置面板（`ChannelConfigPanel`），卸载弹窗新增「删除数据库表」checkbox
- **插件配置弹窗新增「渠道配置」Tab**：调用 `/api/channels/simple` 获取渠道列表，管理员勾选启用代理的渠道并保存，插件根据 channel_id 匹配 `channel_configs` 决定是否走 AGP 代理
- **路由新增**：`/plugins/settings` → `PluginSettings.vue`

#### 废弃旧 API
- `GET /api/plugins/:id/channel-configs` → 404（已移除路由注册）
- 前端 `plugin.ts` API 层移除 `getChannelConfigs`、`saveChannelConfig`、`deleteChannelConfig`

#### 声明式建表引擎
- `buildCreateTableSQL`：解析 `manifest.json` 的 `tables` 声明，生成兼容 SQLite/MySQL/PostgreSQL 的 `CREATE TABLE` SQL
- 安装时自动执行建表，表名存入 `tables_created`（JSON array）
- 卸载时可选 `dropTables=true` 自动 `DROP TABLE`

#### 权限重新安装修复
- 修复 `SyncPermissions` 卸载重装场景：已有权限记录 `status=uninstalled` 时重置为 `pending`（`autoGrant` 时 `granted`）

#### Breaking Changes
- 旧版 `channel_plugin_settings` 表中的配置数据**不会自动迁移**
- `connection_decorator` 插件不再需要渠道级绑定，安装并启用全局钩子即可生效
- 前端无需再为每个渠道单独配置插件，插件管理集中到 `/plugins/settings`

## [0.2.4] - 2026-05-21

### 插件日志统一管理与安全隔离
- **核心改造**：插件 stdout/stderr 重定向到 `logs/plugins/<name>/YYYY-MM-DD.log`，由 AGW 主进程(root)打开日志文件，插件子进程通过 fd 继承写入
- **UID 隔离**：Docker 创建 `agw-plugin` 用户(UID/GID 1001)，`SysProcAttr.Credential` 让插件进程以受限用户运行
  - 插件无法读写 `/app/data/`（数据库）、`/app/config.yaml`（密钥）、`/app/config/.env`（API Key）
  - 插件只能写自己的安装目录（chown 给了插件用户）和通过 stdout 写日志
- **安全加固**：`EnsureSecurePermissions()` 启动时设置 `/app/data/` 0700 权限
- **卸载保留日志**：`DELETE /api/plugins/:id?keep_logs=true` 支持卸载后保留日志目录
- **日志状态 API**：`GET /api/plugins/:id/logs-status` 返回日志目录大小、文件数等元数据
- **插件日志查看**：系统日志页面新增「日志来源」下拉框，支持切换查看系统日志或指定插件日志
- **新增 API**：`GET /api/system/logs/plugins` 返回已安装插件的日志源列表
- **日志格式**：插件日志采用 `YYYY/MM/DD HH:MM:SS [LEVEL] message` 格式，后端 `parsePluginLogLine` 正则解析，无法解析的行 fallback 为 INFO 级别
- **前端改造**：SystemLogs.vue 来源筛选 + source 列；Plugins.vue 卸载弹窗新增「保留日志」checkbox
- **健康检查**：插件健康检查 HTTP server 的 `ErrorLog` 设为 `io.Discard`，防止输出混入日志
- **文件句柄管理**：Manager 新增 `logFileHandles` + `logFileMu`，Stop() 时正确关闭日志文件句柄

### DialTLSContext 插件路径未做 TLS 握手修复
- **问题**：connection_decorator 插件（如 agp-proxy）建立 CONNECT 隧道后返回 raw TCP conn，`engine.go` 直接返回给 `http.Transport`，Go 在裸连接上发明文 HTTP POST 到 HTTPS 端口 → 上游 Nginx 返回 `400 The plain HTTP request was sent to HTTPS port`
- **修复**：提取 `doTLSHandshake` helper，插件路径和标准路径共用——插件拿到 raw conn 后调用 `doTLSHandshake(conn)` 完成 TLS 握手再返回
- **设计原则**：TLS 握手是 AGW 核心职责（证书校验、SNI），不应下沉到插件。插件的职责仅是建立 CONNECT 隧道（决定走哪个代理出口）

### account_id 未注入 ctx 致插件 permHeaders 缺失修复
- **问题**：`Forward()` / `ForwardStream()` 只注入了 `channelID` 到 context，未注入 `accountID`。导致 `dialViaDecorator` 构造的 permHeaders 缺少 `X-AGW-Account-ID`，插件收不到 account_id 而 fallback 直连
- **修复**：两处注入点同时注入 `ctxKeyAccountID`（`internal/proxy/engine.go`）

### 插件上传临时目录可配置
- **问题**：生产容器以非 root 运行，`os.CreateTemp("", ...)` 使用系统 `/tmp` 目录，Gin 的 `SaveUploadedFile` 触发 `chmod /tmp: operation not permitted`
- **修复**：
  - 新增 `plugin.tmp_dir` 配置项，默认 `/app/data/tmp`（`internal/config/config.go`）
  - `plugin_handler.go` 的 Upload 和 RegistryInstall 改为 `os.CreateTemp(tmpDir, ...)`，创建前 `MkdirAll`
  - Dockerfile 创建 `/app/data/tmp` 目录并设 1777 权限
  - 热加载、配置补全、写回全部覆盖新字段

### ChannelPluginSetting 表缺失修复
- **问题**：`channel_plugin_settings` 表在 model 和 AutoMigrate 中定义，但主入口 `sqlite.go` 的 `autoMigrate()` 漏注册，导致渠道配置保存报 `no such table`
- **修复**：`internal/storage/sqlite/sqlite.go` 新增 `&plugin.ChannelPluginSetting{}`

### 插件渠道配置前端可视化
- **改造**：渠道配置卡片从纯 JSON textarea 改为 Switch 开关（启用插件）+ 折叠面板（高级 JSON 编辑）
- **后端**：保存时自动 normalize `enabled` 字段（`Plugins.vue`）
- **i18n**：中英文新增 `enablePlugin` 键

### connection_decorator 插件未生效修复
- **问题**：`ctxKeyChannelID` 只定义和读取，全项目没有代码把 `channelID` 注入 context，导致 `DialTLSContext` 中 `channelID` 永远为 0，`GetConnectionDecoratorAddr(0)` 直接返回空，代理从未触发
- **修复**：`Forward()` 和 `ForwardStream()` 在创建 `upstreamReq` 后注入 `channelID`（`internal/proxy/engine.go`）

### 插件静态编译
- **问题**：agp-proxy 插件以 glibc 动态编译，Alpine（musl）容器缺少 `/lib/ld-linux-aarch64.so.1`，报 `not found`
- **修复**：编译参数加 `CGO_ENABLED=0`，生成纯静态二进制

### 仪表盘优化
- **平均延迟友好格式化**：后端新增 `latency_display` 字段（自动换算 s/m），前端 stat-card 直接显示友好格式
- **请求趋势切换**：按钮组改为 [当天, 7天]；当天按小时粒度展示（hourly_trend），7天按天粒度展示（daily_trend）
- **Token 使用统计**：新增 `GET /stats/token-stats` API，返回总Token数、平均TPM、平均TPR、Token用量前3模型；前端新增 Token 统计卡片组，支持当天/7天/30天三档切换
- **后端**：`formatLatency()` 辅助函数、`TokenStats` / `TokenModelEntry` 类型、`GetTokenStats()` 方法、`trend_mode` 字段
- **前端**：`Dashboard.vue` 重写（增加 Token 统计区域 + 趋势适配）、stats API 新增 `tokenStats()`、i18n 中英文各新增 5 个 key
- **修复**：`common.noData` 改为 `dashboard.noData`（修复多语言未适配问题）

### 账号优先级统一全排修复
- **问题**：批量测试账号后，只对恢复成功的 active 账号重排优先级（`rebalancePriorities` 仅查 `status='active'`），测试失败继续 disabled 的账号保留旧优先级，导致 active 和 disabled 账号优先级重叠重复
- **修复**：
  - 新增 `RebalanceAllPriorities` 方法，改为重排**该渠道全部账号**，三组排序：原有 active → 恢复账号（disable→active，按原优先级 DESC）→ 仍 disabled，全局唯一
  - `BatchTest` 批量测试完成后统一调用一次全排，不再依赖每个账号独立 goroutine 重排（消除并发竞态）
  - 单账号测试 API（`POST /:id/accounts/:accountId/test`）测试后同样触发全排
  - `recoverAccount` 内部移除异步重排 goroutine

### 测试保留原禁用原因
- **问题**：手动测试已 disabled 的账号失败时，无条件覆盖 `disabled_reason` 为 `manual_test_failed`，丢失原始禁用原因（如关键词封禁等）
- **修复**：`TestAccount` 测试前记录账号状态，仅对原 active 账号测试失败时才写 `disabled_reason`，原 disabled 账号保留旧原因

### 渠道列表操作按钮事件冒泡修复
- **问题**：点击操作列的按钮（⚡测试 / ⏸启用禁用 / ⋯更多）有时触发行点击跳转到账号页面，而非执行按钮功能
- **修复**：操作列 3 个按钮的 `onClick` 加 `e.stopPropagation()` 阻止事件冒泡到行级 `onClick`

## [0.2.3]

### 流式请求日志 502 误标记修复（context canceled）
- **问题**：Hermes 等客户端在**正常完成 SSE 流式接收后主动关闭连接**，AGW 的 `ForwardStream` 循环中检查 `ctx.Done()` → 返回 `client disconnected: context canceled`。但 `main.go` 第 507 行对所有流式转发错误**统一写 `statusCode=502`**，导致正常完成的请求被错误标记为 `502 Bad Gateway`
- **根因**：`context.Canceled` 表示「客户端主动断开」，并非上游错误。AGW 的 `account_manager.failure_exclude_keywords` 虽已排除 `context canceled`（不计入连续失败），但**日志记录的 status_code 不受此配置影响**，所有流式错误都写死 502
- **修复**：`cmd/agw/main.go` 流式错误处理中区分两种情况：
  - **已向客户端发送过数据后断开**（`c.Writer.Written()`）：日志 `statusCode=200`，`error_msg="client_gone"`（前端显示红色感叹号图标，tooltip 提示"流状态异常：client_gone"），不触发故障降级
  - **未发送数据即断开**：日志 `statusCode=499`（Nginx 标准：客户端过早断开），触发故障降级
  - 两种情况下客户端返回的 HTTP 状态码均保持 502 让 Hermes 触发重试（只影响日志记录，不影响客户端响应）

### 模型测试弹窗重构
- **改造**：将「批量测试」弹窗升级为「模型测试」弹窗，新增端点类型选择（自动检测 / OpenAI Chat / OpenAI Responses / Anthropic Messages / Gemini 等）、流式模式开关、单模型测试按钮
- **后端**：新增 `TestEndpointInfo` + `TestEndpointProvider` 接口到 Adapter 层，内置适配器（OpenAI/Anthropic/Gemini）实现各端点注册；Registry 新增 `GetChannelTestEndpoints` / `RegisterTestEndpoint`；新增 `POST /:id/test-model`（单模型测试）和 `GET /:id/test-endpoints`（获取端点列表）API；`sendTestRequest` 支持 endpoint/stream 参数，`BatchTestModels` 兼容新参数
- **前端**：新建独立 `ModelTestDialog.vue` 组件替代 Channels.vue 中的内联弹窗；模型排序（上游优先、自定义排后）；状态圆点（未测试黑色、成功绿色+延迟ms、失败红色）；API 层新增 `testSingleModel` / `getTestEndpoints`；i18n 双语 key

### 请求日志时间区间筛选修复
- **问题**：前端 `toISOString()` 输出 ISO 8601 格式（`2026-05-15T04:59:59.000Z`），GORM+SQLite 存储空格分隔格式（`2026-05-15 23:25:14`），SQLite 字符串比较时空格(ASCII 32) < T(ASCII 84)，导致 `timestamp < '...T...'` 条件对当天所有记录都返回 true，时间上限失效
- **根因**：`QueryRequestLogs` 直接将 ISO 格式的字符串传入 GORM Where 子句，SQLite 按字符串对比而非时间语义对比
- **修复**：在 `internal/stats/manager.go` 的 `QueryRequestLogs` 中，对 Start/End 参数先尝试用 `time.Parse(time.RFC3339Nano, ...)` 解析为 `time.Time`，成功则传入 GORM 做 native 时间比较；失败时回退原字符串行为。兼容所有 ISO 8601 格式输入

### 请求日志类型 `active_health_check` 显示异常修复
- **问题**：后端 `probe.go` 写入的 log_type 为 `active_health_check`，但前端 `Logs.vue` 的显示映射表只定义了 `health_check`，匹配失败后直接显示原始字段值 `active_health_check`
- **修复**：`internal/account/probe.go` 两处 `"active_health_check"` 改为 `"health_check"`，与前端映射 key 统一

### 批量测试进度条不显示修复
- **问题**：`Channels.vue` 的 `n-progress` 显式指定 `color="var(--n-color-primary)"` CSS 变量，在暗色主题下该变量未正确定义，导致填充条颜色透明不可见
- **修复**：移除 `:color` 自定义属性，让 `n-progress` 使用 Naive UI 默认的 progress 主题色（在暗色主题下自动生效）

### 渠道列表点击直接进入账号管理页
- **问题**：渠道列表行点击无实际操作（`onClick: () => {}`），需从更多菜单选择「管理密钥」才能进账号页
- **修复**：`rowProps` 的 `onClick` 改为 `selectChannel(_row, 'accounts')`，点击行直接进入该渠道的账号管理 Tab

### 复制渠道增加二次确认
- **问题**：复制渠道按钮无确认弹窗，误触即执行
- **修复**：`handleCopyChannel` 先弹 `dialog.warning` 确认窗口，显示渠道名，用户确认后才执行复制操作。新增中英文 i18n key：`copyChannelConfirm`

### 修复 SSE 流式响应被 Server 层 60 秒强制断开
- `http.Server.WriteTimeout` 从 `60s` 改为 `0`（禁用写超时），让超时控制下放到代理层（`proxy.stream_read_timeout`）
- 根因：Go `http.Server.WriteTimeout` 限制的是从请求开始到响应写完的总时间，SSE 流式响应的整个生命周期都在这个计时内，60 秒后 Server 层强制关闭连接 → `context canceled`
- 此修改解决了生产环境中大量 `stream forward error: read stream/client disconnected: context canceled` 错误（今日 394 次，占全部错误的 79%）

### 账号池稳定性优化
- 优化 `context` 错误区分处理：区分 `context.Canceled`（客户端主动取消）和 `context.DeadlineExceeded`（上游超时）
  - `context.Canceled`：完全不计入失败，不触发渠道级熔断
  - `context.DeadlineExceeded`：不计入账号连续失败，但触发渠道级快速熔断（跨账号失败计数）
- 此修改解决上游高延迟时 AGW 反复重试同一个账号的问题，加快渠道级降级速度

### 前端国际化修复
- 请求日志列表：`cacheDown` 标签硬编码改为多语言支持（`缓存↓` / `Cache↓`）
- 请求日志详情页：标题 `📋 请求/响应详细内容`、标签 `📤 请求`、`📥 响应`、状态文本 `加载中...`、`无法加载详细内容` 等 6 处硬编码改为多语言支持

### 前端交互增强
- 请求日志列表：密钥列添加点击复制功能
- 请求日志列表：渠道列添加点击复制功能
- 请求日志详情页：密钥名称、渠道名称添加点击复制功能
- 渠道管理-批量测试弹窗：修复全选按钮显示 `channels.selectAll`（不存在）改为 `common.selectAll`
- 模型管理页：左右两侧的模型名称均可点击复制

## [0.2.2] - 2026-05-13

### 代理引擎修复
- 修复 `upstreamReq.Body` 被插件 `pre_request` 代码读空导致转发给上游时请求体丢失 — 在创建 `upstreamReq` 后立即预读并独立备份 body

### 模型可见性修复
- 修复 `GetVisibleModels` 与 `GetUpstreamModels` 可见性判断不一致 — `/v1/models` 改用 `GROUP BY + HAVING MIN(visible)=1`，确保同名模型跨多渠道时全部行勾选才暴露

### 请求日志增强
- 新增 `first_token_ms`（FRT 首Token时间）字段，流式请求计时从请求发出到收到首个 chunk 的耗时
- 前端延迟列：流式请求展示 FRT 标签（绿色），替换原有的上游延迟展示

### 批量测试与恢复优化
- 批量恢复改为异步执行 + 202 响应，解决大数据量同步超时问题
- 新增批量测试功能：支持按 disabled/active/all 三种模式批量测试渠道下账号
- 批量测试下拉按钮：测试禁用密钥 / 测试有效密钥 / 测试所有密钥

### 管理 API 修复
- 修复 `ListByChannel` 返回结果遗漏 `disabled_reason` 字段

## [0.2.1] - 2026-05-13

### 账号池稳定性优化
- 移除误恢复逻辑：删除 `channel_enable_on_success`，不再因某账号健康而连带恢复同渠道其他禁用账号
- `ReportResult` 排除 `context canceled` 导致的误判，此类上游取消不计入连续失败计数
- 修复 `probe_cooldown_until` 字段语义冲突，解决探测停滞问题

### 重试与熔断增强
- 流式请求重试次数从固定 1 次改为可配置（默认 3 次）
- 账号连续失败阈值从 5 次降到 3 次，更快触发禁用
- 新增渠道级快速熔断：跨账号连续失败时跳过整个渠道

### 管理功能
- 账号新增 `disabled_reason` 字段，记录禁用原因便于排查
- 账号手动测试 + 批量恢复功能
- 冷却后半段试探性探测（`cooldown_probe_interval`）
- 恢复账号时自动重排整体优先级

## [0.2.0] - 2026-05-12

### 🏠 全新品牌首页
- 访问 `/` 不再跳转登录页，展示高端品牌首页
- 包含 Hero 区（品牌名、描述、CTA 按钮）、核心特性卡片（6 项）、技术栈展示
- 导航栏：首页 / 控制台 / 文档 / 关于
- 新增 Home.vue、Docs.vue（开发中占位）、About.vue
- 中英文 i18n 各新增 30+ key

### 🔐 登录升级：Token → 账户+密码
- 废弃旧的 `AGW_SERVER_API_TOKEN` 单 token 认证
- 改用 `AGW_ADMIN_USER` + `AGW_ADMIN_PASS` 账户密码登录
- `ServerConfig.APIToken` → `AdminUser` + `AdminPass`
- 登录页改为用户名+密码两个输入框
- 兼容提示：检测到旧 `AGW_SERVER_API_TOKEN` 时打印醒目升级警告

### 💾 Session 持久化
- 新增 `Session` GORM model（`sessions` 表），容器重启登录态不丢失
- 三层降级存储：Redis → SQLite → 内存 map
- 新增 `RedisSessionStore`（需配置 `redis.enabled=true`），TTL 自动过期
- 新增 `SQLiteSessionStore`，通过 `SessionStore` 接口实现
- 新增 `NewSessionStore()` 工厂函数，自动探测可用存储
- 每小时自动清理过期 session（SQLite/内存模式）

### 🔄 统一迁移入口
- 新增 `internal/config/migration.go` — 集中管理版本升级检测
- 启动流程：检查 `data/.agw_version` → 版本匹配跳过 / 不匹配执行迁移
- 状态标记：OK 0.2.0 / MIGRATING / FAILED，迁移中断后自动恢复
- 数据库备份机制：迁移前备份到 `data/backups/`，失败时自动恢复
- 旧备份自动清理：超过 30 天的备份文件自动删除
- 环境变量自动迁移：检测到旧 `AGW_SERVER_API_TOKEN` → 自动写入 `AGW_ADMIN_USER/PASS` 并删除旧行

### ⚠️ Breaking Changes
- `AGW_SERVER_API_TOKEN` 已废弃，请改用 `AGW_ADMIN_USER` + `AGW_ADMIN_PASS`


## [0.1.5] - 2026-05-12

### 失败关键词 UI 优化
- **Tag 只读展示 + 独立输入框**：将失败关键词输入从 `<n-dynamic-tags>` 改为 tag 只读展示（可关闭删除）+ 下方独立输入框 + 回车/按钮添加，解决 tag 内编辑文本框过短的问题
- **去重检测**：`addKeyword()` 添加前检查重复，避免同一条短句重复添加
- **术语修正**：i18n 中"失败关键词"改为"失败关键词/短句"，提示语同步更新为中英文
- **新增 i18n key**：`keywordsEmpty` / `keywordsPlaceholder` / `keywordsAdd` 中英文各 3 个

### 插件权限管理系统

- **权限声明**：插件在 `manifest.json` 中新增 `permissions` 字段，声明所需权限及是否必需（`required`）
- **11 个权限项**：`account_id` / `channel_id` / `keys_id` / `model_name` / `request_headers` / `request_body_summary` / `response_status` / `response_body_summary` / `server_info` / `channel_info` / `channel_config`
- **TriggerHook 数据过滤（P0 安全修复）**：`filterHookRequest` 根据授权结果过滤 `HookRequest` 字段，未授权字段置零/置空，无权限声明的插件照原样传递（向后兼容）
- **CONNECT 协议权限头部**：`dialViaDecorator` 根据授权结果携带 `X-AGW-Account-ID` / `X-AGW-Channel-ID` 等头部
- **管理员授权 UI**：插件卡片新增「权限」按钮 → 权限管理弹窗（Switch 开关 + 状态标签 + 授予/撤销/全部授予/全部撤销）
- **高敏感权限二次确认**：`request_headers` 和 `channel_config` 授予时弹窗警告
- **启动时权限检查**：`required: true` 的权限被拒绝时拒绝启动插件
- **自动授权模式**：`auto_grant_permissions: true` 时安装即授予所有权限（高敏感仍需二次确认）
- **权限缓存**：`permissionCache` + `sync.RWMutex`，管理 API 更新时实时刷新
- **插件升级同步**：`SyncPermissions` 处理新增/更新/删除的权限声明
- **卸载保留审计**：权限记录标记 `uninstalled` 但不删除
- **审计日志**：`plugin_permission_granted` / `denied` / `auto_granted` / `grant_all` / `deny_all` 结构化日志
- **API**：`GET /:id/permissions` / `PUT /:id/permissions/:permName/grant` / `deny` / `POST grant-all` / `deny-all`
- **前端 i18n**：中英文各新增 16 个 key

## [0.1.4] - 2026-05-12

### 渠道监控与自动处置系统

- **配置自动补全**：`EnsureConfigCompleteness` 启动时自动检测客户 config.yaml 缺失字段并补全，旧字段 `global_health_check_interval` 自动迁移到 `channel_health_check_interval`
- **401/403 立即禁用**：`ReportResult` 中匹配 `channel_disable_status_codes`（默认 401/403）时跳过连续失败计数逻辑，直接禁用账号
- **关键词匹配禁用**：`CheckDisableKeywords` 在 engine.go 错误路径检查上游响应体，匹配到关键词（不区分大小写）时自动禁用账号。默认覆盖 11 个常见封号/欠费/认证失败关键词
- **响应超时禁用**：`channel_disable_latency_threshold` 非流式请求响应时间超阈值时累积失败计数（仅非流式，流式含推理时间易误伤）
- **主动探测增强**：`healthCheckChannel` 两阶段逻辑——第一阶段恢复 disabled/cooling 账号，第二阶段对 active 账号主动探测
- **请求体重试修复**：`ForwardStream` / `Forward` 重试时 `c.Request.Body` 已被首次请求消耗导致空 body，改为缓存 `reqBodyBytes` 并在每次重试前重置
- **Accept-Encoding 过滤**：请求发给上游前移除 `Accept-Encoding: gzip`，防止上游返回 gzip 压缩的 502 导致 JSON 解码失败
- **流式读取超时**：`stream_read_timeout` 配置项 + `SetReadDeadline` 防止流式请求长时间无数据卡死
- **前端监控配置页面**：新增 `SystemMonitor.vue`（`/settings/monitor`），5 个分组卡片——定期渠道测试 / 响应时间限制 / 自动禁用状态码 / 自动重试状态码 / 失败关键词
- **前端菜单与路由**：系统子菜单新增「监控」入口，i18n 中英文各新增 18 个 key
- **Settings 页面修正**：`global_health_check_interval` → `channel_health_check_interval`

### AccountManagerConfig 新增字段

- `channel_health_check_interval`（默认 43200 秒 = 12h，替代废弃的 `global_health_check_interval`）
- `channel_disable_latency_threshold`（默认 0 = 不启用，单位秒）
- `channel_disable_on_failure`（默认 true）
- `channel_enable_on_success`（默认 true）
- `channel_disable_status_codes`（默认 [401, 403]）
- `channel_retry_status_codes`（默认 [502, 503, 504]，仅展示暂未实现重试逻辑）
- `channel_disable_keywords`（默认 11 个关键词，不区分大小写匹配）

## [0.1.3] - 2026-05-11

### 流式 Token 统计修复
- 修复流式请求 token 统计为 0 的问题：`ForwardStream` 自动注入 `stream_options: {"include_usage": true}`，让上游在流式最后一个 chunk 返回 usage 数据
- 仅在请求体未包含 `stream_options` 时注入，已有则不覆盖

### 缓存命中 Token 提取与展示
- `TokenUsage` 结构体新增 `CachedTokens` 字段
- 新增 `extractCachedTokens()` 函数，支持 OpenAI 格式（`prompt_tokens_details.cached_tokens`）和 Anthropic 格式（`cache_read_input_tokens`）
- 非流式和流式两条提取路径均已接入缓存提取逻辑
- `buildRequestLog` 写入 `CacheTokens` 到数据库，前端日志表格和详情面板均展示缓存命中数值，使用逗号分隔格式

### Bug 修复
- 修复模型设置页面保存失败：`catalog_service` 中 `BatchSetUpstreamVisible` / `BatchSetDisplayVisible` 使用 `Model(&gorm.Model{})` 导致 GORM 自动注入 `updated_at` 和 `deleted_at`，但 `channel_models` 表无此两列。改为直接 `.Table("channel_models")` 操作

## [0.1.2] - 2026-05-10

### 插件系统：Sidecar TCP 代理模式（重大架构升级）
- 抛弃 system 类型，全面改为 sidecar 模式，满足「插件非空壳 + AGW 零依赖」两条铁律
- 移除 `pkg/sdk.ConnectionDecorator` 接口/注册表 + `cmd/agw/main.go` blank import
- 代理引擎 `DialTLSContext` 改为查询数据库获取启用的 connection_decorator 插件地址
- 新增 `dialViaDecorator()` + CONNECT 协议转发，插件不可用时自动回退标准 TLS
- TLS 指纹伪装插件重写为独立 sidecar TCP 代理进程（CONNECT + utls + /health 端点）
- 修复启动子进程绑定请求 context 导致被 kill 的问题（改用 `context.Background()`）
- 修复健康检查端口错误：plugin.Port → plugin.Port+1（sidecar 类型 health 在 port+1）

### 插件安装流程优化
- 上传 ZIP 后不再自动安装，改为先展示预览（名称/版本/描述/类型/钩子）
- 新增 `POST /plugins/upload`（解析返回预览 + upload_id）
- 新增 `POST /plugins/install`（根据 upload_id 执行实际安装）
- 前端上传后直接加入列表（uploaded 状态），安装按钮在操作区
- 前端上传按钮增加 loading 效果
- 插件市场按钮根据系统配置 `plugin_registry_url` 动态显隐
- 渠道类型插件自动发现：启动后通过 `/.well-known/channel-type` 注册新渠道类型

### 插件注册中心
- 新增 `marketplace_url` / `plugin_registry_url` 配置项，支持远程插件列表 + 一键安装
- 前端渠道类型下拉框从 API 动态获取（不再硬编码），选插件类型时自动填充 base_url

### 模型管理模块
- `model_catalog` 表 + 全量同步逻辑（SaveModels/Delete/UpdateStatus 触发）
- `/v1/models` 端点实现（OpenAI 兼容格式，返回可见模型）
- 管理端 API：`GET /api/models/catalog`、`PUT /api/models/catalog/:id/visibility`
- 前端模型管理页面：左右两列（已选 / 自定义映射）+ 可见性开关
- 渠道模型配置弹窗整合进 Tab 页，去掉弹窗壳
- 跨渠道自定义模型名自动补全：`GET /channels/custom-model-names`
- 模型设置双栏多选模式（已启用/已禁用），支持全选和批量移动
- 新增自定义模型输入功能：手动输入未抓取到的上游模型

### 仪表盘升级
- 后端新增 `hourly_trend`、`top_models`、`top_channels`、`recent_errors` 统计维度
- 前端重写：5 列统计卡片（成功率/延迟颜色规则）+ ECharts 图表 + 异常表格 + 30 秒自动刷新

### Bug 修复
- 修复渠道分组创建后左侧列表统计数不刷新
- 修复密钥分组创建 500 错误（`autoMigrate` 缺少 `KeysGroupChannelGroup` 表注册）
- 修复渠道账号创建时可重复添加相同密钥（新增同渠道下密钥去重检测）
- 修复渠道编辑页面优先级默认值矛盾（min 从 0 改为 1）
- 修复 GitHub Models 等无 `/v1/models` 端点的渠道测试连接 404
- 修复渠道权重/RPM/TPM 提示文案缺失
- 修复模型配置 Tab 全选按钮显示原始 i18n key（`channels.selectAll` → `common.selectAll`）
- 修复搜索无结果时自定义模型输入框被隐藏的问题（自定义模型输入移出搜索结果区，始终显示）
- 修复 auto-complete 一点击文本框就弹出建议列表 → 改为输入内容变更后才查询匹配

## [0.1.1] - 2026-05-08

### 阶段七：扩展与完备
- Anthropic 适配器（Claude Messages API 协议转换 + 流式）
- Gemini 适配器（Google generateContent 协议转换 + 流式）
- 插件系统核心（Sidecar 进程管理 + 钩子调度 + Go SDK + 安装/启动/停止/卸载）
- Docker 多阶段构建 + docker-compose
- README + CHANGELOG

## [0.1.0] - 2026-05-06

### 阶段一至六：核心功能交付
- 项目骨架与目录结构、配置加载（Viper + .env）、存储抽象层（GORM + SQLite）
- 全局加密服务（AES-256-GCM）、系统日志（zap 按日归档）
- HTTP 代理引擎（连接池/超时/流式 SSE 透传）+ OpenAI 适配器
- 账号池核心逻辑（CRUD/优先级/粘性绑定/故障降级/自动探测恢复/解密缓存）
- 密钥管理 + API Key 认证 + RPM/TPM 配额
- 渠道分组 + 密钥分组管理 + 模型存在性过滤 + 分层确定性路由引擎
- 8 个 RESTful 管理 API + Vue 前端 8 个页面（Dashboard/密钥/渠道/分组/统计/日志/插件/设置）
- 模型自动发现（FetchModels + SaveModels）+ 中英文国际化
- 异步日志写入 + 内存实时计数器 + 日聚合调度器
- 前后端联调通过，29 个单元测试