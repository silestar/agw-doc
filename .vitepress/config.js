export default {
  title: 'AGW (AIGateway)',
  description: '高性能多租户 AI API 聚合代理系统',
  lang: 'zh-CN',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  
  themeConfig: {
    logo: '/logo.png',
    
    nav: [
      { text: '用户指南', link: '/guide/quick-start' },
      { text: '系统架构', link: '/architecture/overview' },
      { text: '核心模块', link: '/modules/account-pool' },
      { text: '插件开发', link: '/plugin-dev/overview' },
      { text: 'API 参考', link: '/api/overview' },
      { text: '变更日志', link: '/changelog' },
      {
        text: 'v0.3 (最新)',
        items: [
          { text: 'v0.3 (最新)', link: '/' },
          { text: 'v0.2', link: '/v0.2/' },
          { text: 'v0.1', link: '/v0.1/' },
        ]
      },
      { text: 'GitHub', link: 'https://github.com/silestar/AIGateway' }
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: '用户指南',
          items: [
            { text: '什么是 AGW？', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '部署指南', link: '/guide/deployment' },
            { text: '配置说明', link: '/guide/configuration' },
            { text: '渠道配置', link: '/guide/channel-setup' },
            { text: '消费者密钥管理', link: '/guide/consumer-keys' },
            { text: '分组与路由', link: '/guide/groups' },
            { text: '插件管理', link: '/guide/plugin-management' },
            { text: '监控与统计', link: '/guide/monitoring' },
            { text: '状态码说明', link: '/guide/status-codes' },
            { text: 'AGP 代理池集成', link: '/guide/agp-integration' },
            { text: 'API 一览', link: '/guide/api-reference' },
            { text: '常见问题', link: '/guide/faq' },
          ]
        }
      ],
      '/architecture/': [
        {
          text: '系统架构',
          items: [
            { text: '总体架构', link: '/architecture/overview' },
            { text: '智能路由机制', link: '/architecture/routing' },
            { text: '账号池设计', link: '/architecture/account-pool' },
            { text: '故障转移与重试链路', link: '/architecture/retry-chain' },
            { text: '插件系统架构', link: '/architecture/plugin-system' },
            { text: 'AGP 代理池集成', link: '/architecture/proxy-pool' },
          ]
        }
      ],
      '/modules/': [
        {
          text: '核心模块',
          items: [
            { text: '消费者管理', link: '/modules/consumer' },
            { text: '账号池核心逻辑', link: '/modules/account-pool' },
            { text: '渠道与分组管理', link: '/modules/channel' },
            { text: '插件管理器', link: '/modules/plugin-manager' },
            { text: '统计与日志', link: '/modules/stats-logging' },
            { text: '模型自动发现', link: '/modules/model-discovery' },
            { text: '渠道监控与自动处置', link: '/modules/monitor-automation' },
          ]
        }
      ],
      '/plugin-dev/': [
        {
          text: '插件开发',
          items: [
            { text: '开发概述', link: '/plugin-dev/overview' },
            { text: '快速上手', link: '/plugin-dev/getting-started' },
            { text: '插件架构', link: '/plugin-dev/architecture' },
            { text: '生命周期', link: '/plugin-dev/lifecycle' },
            { text: 'manifest.json 规范', link: '/plugin-dev/manifest' },
            { text: '通信协议', link: '/plugin-dev/communication' },
            { text: 'pre_request / post_response', link: '/plugin-dev/hooks-pre-request' },
            { text: 'account_select / on_log', link: '/plugin-dev/hooks-account-log' },
            { text: 'connection_decorator', link: '/plugin-dev/hooks-connection-decorator' },
            { text: 'Go SDK 参考', link: '/plugin-dev/sdk-reference' },
            { text: '权限框架', link: '/plugin-dev/permission-framework' },
            { text: '渠道类型插件（高级）', link: '/plugin-dev/channel-type' },
            { text: '打包与分发', link: '/plugin-dev/packaging' },
            { text: '⚠️ 开发要求', link: '/plugin-dev/requirements' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'API 概述', link: '/api/overview' },
            { text: '代理调用 API', link: '/api/proxy-api' },
            { text: '管理 API', link: '/api/management-api' },
          ]
        }
      ],
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/silestar/AIGateway' }
    ],
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 AIGateway'
    },
    
    search: {
      provider: 'local'
    }
  }
}