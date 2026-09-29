import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw, XCircle, CreditCard, Settings, Download, RotateCcw } from 'lucide-react';
import type { UserSubscription } from '@/types';
import { useStore } from '@/store/useStore';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/utils';

interface SubscriptionCardProps {
  subscription: UserSubscription;
  index?: number;
}

export default function SubscriptionCard({ subscription, index = 0 }: SubscriptionCardProps) {
  const { cancelSubscription, toggleAutoRenew, renewSubscription, downloadInvoice, isAuthenticated } = useStore();
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [actionError, setActionError] = useState('');

  const statusConfig = {
    active: { label: '活跃中', className: 'badge-active' },
    expired: { label: '已过期', className: 'badge-expired' },
    cancelled: { label: '已取消', className: 'badge-expired' },
  };

  const status = statusConfig[subscription.status];

  const runAction = async (action: () => Promise<void>, busy: (v: boolean) => void) => {
    if (!isAuthenticated) return;
    setActionError('');
    busy(true);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : '操作失败，请稍后重试');
      setTimeout(() => setActionError(''), 3000);
    } finally {
      busy(false);
    }
  };

  const handleCancel = () =>
    runAction(() => cancelSubscription(subscription.id), setIsCancelling);

  const handleToggleAutoRenew = () =>
    runAction(() => toggleAutoRenew(subscription.id), setIsToggling);

  const handleRenew = () =>
    runAction(() => renewSubscription(subscription.id), setIsRenewing);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="card-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dark-900 p-1.5 border border-gray-700/50 overflow-hidden">
            <img
              src={subscription.toolLogo}
              alt={subscription.toolName}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{subscription.toolName}</h3>
            <p className="text-gray-400 text-sm">{subscription.planName} 方案</p>
          </div>
        </div>
        <span className={status.className}>{status.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-dark-900/50 rounded-xl p-3">
          <p className="text-gray-500 text-xs mb-1">
            {subscription.period === 'yearly' ? '年付金额' : '月付金额'}
          </p>
          <p className="text-xl font-bold text-white">¥{subscription.price}</p>
        </div>
        <div className="bg-dark-900/50 rounded-xl p-3">
          <p className="text-gray-500 text-xs mb-1">自动续费</p>
          <p className={cn(
            'text-lg font-bold',
            subscription.autoRenew ? 'text-green-400' : 'text-gray-500'
          )}>
            {subscription.autoRenew ? '已开启' : '已关闭'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>到期: {subscription.endDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          <span>{subscription.period === 'yearly' ? '按年付费' : '按月付费'}</span>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/40 rounded-lg text-red-400 text-xs">
          {actionError}
        </div>
      )}

      {subscription.status === 'active' && (
        <div className="space-y-3 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAutoRenew}
              disabled={isToggling}
              className={cn(
                'flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50',
                subscription.autoRenew
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isToggling && 'animate-spin')} />
              {isToggling
                ? '处理中...'
                : subscription.autoRenew
                  ? '关闭自动续费'
                  : '开启自动续费'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              <XCircle className={cn('w-4 h-4', isCancelling && 'animate-pulse')} />
              {isCancelling ? '取消中...' : '取消订阅'}
            </button>
            <button className="p-2.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              setIsDownloading(true);
              downloadInvoice(subscription.id);
              setTimeout(() => setIsDownloading(false), 1000);
            }}
            disabled={isDownloading}
            className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-white/5 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? '下载中...' : '下载发票'}
          </button>
        </div>
      )}

      {subscription.status !== 'active' && (
        <div className="space-y-3 pt-4 border-t border-gray-800">
          <button
            onClick={handleRenew}
            disabled={isRenewing}
            className="w-full btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RotateCcw className={cn('w-4 h-4', isRenewing && 'animate-spin')} />
            {isRenewing ? '续订中...' : '重新订阅'}
          </button>
          <button
            onClick={() => {
              setIsDownloading(true);
              downloadInvoice(subscription.id);
              setTimeout(() => setIsDownloading(false), 1000);
            }}
            disabled={isDownloading}
            className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-white/5 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? '下载中...' : '下载发票'}
          </button>
        </div>
      )}
    </motion.div>
  );
}
