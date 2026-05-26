# manifest.json 规范

## 文件说明

`manifest.json` 是每个插件的身份描述文件，放在插件根目录。AGW 读取它来识别和加载插件。

## 完整格式

```json
{
  "name": "content-filter",
  "version": "1.0.0",
  "description": "内容安全过滤插件",
  "author": "your-name",
  "hooks": ["pre_request", "post_response"],
  "permissions": {
    "should_request": ["request_body_summary", "model_name"],
    "should_response": ["response_body_summary", "response_status"]
  },
  "requires": {
    "agw_version": ">=1.0.0"
  },
  "config_schema": {
    "blocked_keywords": {
      "type": "array",
      "description": "需要拦截的关键词列表",
      "default": []
    },
    "action": {
      "type": "string",
      "enum": ["block", "warn"],
      "default": "block"
    }
  }
}
```

## 字段说明

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | ✅ | 插件唯一标识，安装后不可修改 |
| `version` | ✅ | 语义化版本 |
| `description` | ✅ | 简要说明 |
| `author` | 否 | 作者信息 |
| `hooks` | ✅ | 订阅的钩子列表 |
| `permissions` | ✅ | 声明所需的数据权限 |
| `requires` | 否 | AGW 版本要求 |
| `config_schema` | 否 | 前端可生成配置表单 |

## 权限声明

`permissions` 中的键对应钩子名，值为该钩子需要的字段列表：

```json
{
  "permissions": {
    "should_request": ["request_body_summary", "model_name", "channel_id"],
    "should_response": ["response_body_summary", "response_status"]
  }
}
```

权限列表见 [插件权限框架](./permission-framework)。

## 版本要求

```json
{
  "requires": {
    "agw_version": ">=2.0.0"
  }
}
```

版本不符合时拒绝安装或提示升级。

## 配置 Schema

`config_schema` 定义了管理员在面板中看到的配置表单：

```json
{
  "config_schema": {
    "threshold": {
      "type": "number",
      "description": "敏感度阈值",
      "default": 0.8,
      "min": 0,
      "max": 1
    },
    "mode": {
      "type": "string",
      "enum": ["strict", "moderate", "lenient"],
      "default": "moderate"
    }
  }
}
```

支持的类型：`string`、`number`、`boolean`、`array`、`object`。