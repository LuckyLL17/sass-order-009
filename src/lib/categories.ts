/** 与后端分类枚举保持一致的前端静态元数据（非 Mock 业务数据） */
export const categories = [
  { id: 'design', name: '设计工具', icon: 'Palette', color: 'from-pink-500 to-rose-500' },
  { id: 'development', name: '开发工具', icon: 'Code2', color: 'from-blue-500 to-cyan-500' },
  { id: 'marketing', name: '营销工具', icon: 'TrendingUp', color: 'from-amber-500 to-orange-500' },
  { id: 'collaboration', name: '协作工具', icon: 'Users', color: 'from-green-500 to-emerald-500' },
] as const;
