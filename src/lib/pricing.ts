/** 平台自身的套餐方案（静态展示数据，非用户订阅数据） */
export const pricingPlans = [
  {
    id: 'personal',
    name: '个人版',
    description: '适合个人开发者和自由职业者',
    price: 0,
    period: 'monthly',
    features: [
      '浏览所有工具',
      '最多5个活跃订阅',
      '基础账单管理',
      '社区支持'
    ],
    recommended: false
  },
  {
    id: 'team',
    name: '团队版',
    description: '适合中小企业和创业团队',
    price: 29,
    period: 'monthly',
    features: [
      '所有个人版功能',
      '无限活跃订阅',
      '团队成员管理',
      '订阅分配功能',
      '高级账单分析',
      '优先客户支持',
      '专属客户经理'
    ],
    recommended: true
  },
  {
    id: 'enterprise',
    name: '企业版',
    description: '适合大型企业和机构',
    price: 99,
    period: 'monthly',
    features: [
      '所有团队版功能',
      'SSO单点登录',
      '高级安全审计',
      '定制化集成',
      '专属技术支持',
      'SLA服务保障',
      '定制化培训'
    ],
    recommended: false
  }
];
