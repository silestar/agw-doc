---
layout: home

hero:
  name: "AIGateway"
  text: "高性能多租户 AI API 聚合代理"
  tagline: 统一管理多个上游 AI 服务商的 API 调用，智能路由、账号池管理、故障转移、全链路追踪
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 查看文档
      link: /guide/deployment
    - theme: alt
      text: GitHub
      link: https://github.com/silestar/AIGateway

features:
  - icon: 🚀
    title: 高性能
    details: Go 实现，零拷贝流式传输，连接池复用，支持 AMD64 和 ARM64 双架构
  - icon: 🔐
    title: 多租户
    details: 独立的消费者 API Key，支持命名、配额和使用统计
  - icon: 🧠
    title: 智能路由
    details: 渠道权重 + 账号优先级，确定性选择，模型存在性过滤
  - icon: 🏦
    title: 账号池管理
    details: 单渠道多账号，优先级、粘性复用、故障降级、冷却恢复
  - icon: 📊
    title: 全链路追踪
    details: 请求链路完整追踪，包含重试链，多维度统计分析
  - icon: 🔌
    title: 插件系统
    details: Sidecar 插件钩子，可扩展认证、过滤、计费、TLS 伪装
---