import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  History,
  Wallet,
  PieChart,
  Download,
  Plus,
  TrendingUp,
  Calendar,
  Receipt
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from 'recharts';
import SubscriptionCard from '@/components/SubscriptionCard';
import { useStore } from '@/store/useStore';
import { api } from '@/api/client';
import type { Bill, CategorySpending, MonthlySpending } from '@/types';
import { cn } from '@/lib/utils';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

type TabType = 'active' | 'history' | 'billing';

export default function Subscriptions() {
  const { subscriptions, downloadInvoice, isAuthenticated, loadSubscriptions } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadSubscriptions().catch(() => undefined);
    api
      .subscriptionStats()
      .then((data) => {
        setBills(data.bills);
        setMonthlySpending(data.monthlySpending);
        setCategorySpending(data.categorySpending);
      })
      .catch(() => undefined);
  }, [isAuthenticated, loadSubscriptions]);

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const inactiveSubscriptions = subscriptions.filter(s => s.status !== 'active');

  // 月支出仅按月付订阅累计；年付按折算月价（与后端统计口径一致）
  const totalMonthlySpending = activeSubscriptions.reduce(
    (sum, sub) => sum + (sub.period === 'yearly' ? sub.price / 12 : sub.price),
    0
  );
  const yearlySavings = totalMonthlySpending * 12 * 0.3;

  const tabs = [
    { id: 'active' as TabType, label: '我的订阅', icon: CreditCard, count: activeSubscriptions.length },
    { id: 'history' as TabType, label: '历史记录', icon: History, count: inactiveSubscriptions.length },
    { id: 'billing' as TabType, label: '账单管理', icon: Wallet, count: bills.length },
  ];

  return (
    <div className="min-h-screen bg-dark-950 pt-24">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            订阅<span className="gradient-text">管理</span>
          </h1>
          <p className="text-xl text-gray-400">
            管理您的所有订阅，查看账单和支出分析
          </p>
        </motion.div>

        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card text-center py-16 mb-8"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-800 flex items-center justify-center">
              <CreditCard className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">登录后查看您的订阅</h3>
            <p className="text-gray-400 mb-6">订阅数据与账单会安全保存，刷新或更换设备后依然可见</p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/login" className="btn-primary">去登录</Link>
              <Link to="/register" className="btn-outline">免费注册</Link>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn('grid grid-cols-1 md:grid-cols-3 gap-6 mb-8', !isAuthenticated && 'opacity-50 pointer-events-none')}
        >
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-primary-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">活跃订阅</p>
                <p className="text-3xl font-bold text-white">{activeSubscriptions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary-500/20 to-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-secondary-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">月支出</p>
                <p className="text-3xl font-bold text-white">¥{totalMonthlySpending}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">预计年节省</p>
                <p className="text-3xl font-bold text-green-400">¥{Math.round(yearlySavings)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary-400" />
                支出趋势
              </h3>
              <span className="text-sm text-gray-400">近6个月</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`¥${value}`, '支出']}
                  />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-secondary-400" />
                分类占比
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categorySpending.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`¥${value}`, '支出']}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 p-1 bg-dark-800/50 rounded-xl w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-dark-900 text-gray-500'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {activeTab === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {activeSubscriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeSubscriptions.map((sub, index) => (
                  <SubscriptionCard key={sub.id} subscription={sub} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-800 flex items-center justify-center">
                  <CreditCard className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">暂无活跃订阅</h3>
                <p className="text-gray-400 mb-6">浏览工具市场，发现适合您的工具</p>
                <Link to="/market" className="btn-primary">
                  <Plus className="w-4 h-4" />
                  添加订阅
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {inactiveSubscriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {inactiveSubscriptions.map((sub, index) => (
                  <SubscriptionCard key={sub.id} subscription={sub} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-800 flex items-center justify-center">
                  <History className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">暂无历史记录</h3>
                <p className="text-gray-400">您的订阅历史记录将显示在这里</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'billing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary-400" />
                  支付方式
                </h3>
                <button className="btn-outline text-sm">
                  <Plus className="w-4 h-4" />
                  添加支付方式
                </button>
              </div>
              <div className="bg-dark-900/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 rounded bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">VISA</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">•••• •••• •••• 4242</p>
                    <p className="text-gray-500 text-sm">到期 12/2027</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-active">默认</span>
                  <button className="text-gray-400 hover:text-white text-sm">编辑</button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-400" />
                  账单历史
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">日期</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">描述</th>
                      <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">金额</th>
                      <th className="text-center py-4 px-4 text-gray-400 font-medium text-sm">状态</th>
                      <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 text-gray-300">{bill.date}</td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-white">{bill.items.map(i => i.name).join(', ')}</p>
                            <p className="text-gray-500 text-sm">{bill.items.length} 个项目</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right text-white font-semibold">¥{bill.amount}</td>
                        <td className="py-4 px-4 text-center">
                          {bill.status === 'paid' && <span className="badge-active">已支付</span>}
                          {bill.status === 'pending' && <span className="badge-pending">待支付</span>}
                          {bill.status === 'failed' && <span className="badge-expired">支付失败</span>}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              // 按账单首项匹配对应订阅生成发票
                              const firstName = bill.items[0]?.name ?? '';
                              const matched = subscriptions.find((s) =>
                                firstName.startsWith(s.toolName)
                              );
                              setDownloadingId(bill.id);
                              downloadInvoice(matched?.id ?? subscriptions[0]?.id ?? '');
                              setTimeout(() => setDownloadingId(null), 1000);
                            }}
                            disabled={downloadingId === bill.id}
                            className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1 ml-auto disabled:opacity-50"
                          >
                            <Download className={cn('w-4 h-4', downloadingId === bill.id && 'animate-spin')} />
                            {downloadingId === bill.id ? '下载中' : '发票'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
