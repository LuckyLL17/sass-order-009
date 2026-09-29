import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Users,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { toolsApi } from '@/api/services';
import { ApiRequestError } from '@/api/client';
import { useStore } from '@/store/useStore';
import ToolCard from '@/components/ToolCard';
import type { Tool, Plan, PlanPeriod } from '@/types';

export default function ToolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addSubscription, isAuthenticated, categories } = useStore();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [isYearly, setIsYearly] = useState(false);

  const [tool, setTool] = useState<Tool | null>(null);
  const [related, setRelated] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setSelectedPlan(null);
    setError('');
    toolsApi
      .detail(id!)
      .then((data) => {
        if (cancelled) return;
        setTool(data.tool);
        setRelated(data.related);
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiRequestError && err.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 pt-24 flex items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }

  if (notFound || !tool) {
    return (
      <div className="min-h-screen bg-dark-950 pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">工具未找到</h1>
          <Link to="/market" className="btn-primary">
            返回工具市场
          </Link>
        </div>
      </div>
    );
  }

  const categoryInfo = categories.find((c) => c.id === tool.category);

  const yearlyPrice = (plan: Plan) => Math.round(plan.price * 12 * 0.8);

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/tool/${tool.id}` } });
      return;
    }

    const period: PlanPeriod = isYearly ? 'yearly' : 'monthly';
    setSubmitting(true);
    setError('');
    try {
      // 前端生成幂等键，防止双击/重试造成重复订阅
      const idempotencyKey = `sub-${tool.id}-${selectedPlan.id}-${period}-${Date.now()}`;
      await addSubscription({ planId: selectedPlan.id, period }, idempotencyKey);
      setShowSubscribeModal(false);
      navigate('/subscriptions');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '订阅失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const nextScreenshot = () => {
    setCurrentScreenshot((prev) => (prev + 1) % tool.screenshots.length);
  };

  const prevScreenshot = () => {
    setCurrentScreenshot((prev) => (prev - 1 + tool.screenshots.length) % tool.screenshots.length);
  };

  return (
    <div className="min-h-screen bg-dark-950 pt-24">
      <div className="container mx-auto px-4 py-12">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="w-24 h-24 rounded-2xl bg-dark-800 p-3 flex-shrink-0 border border-gray-700/50 overflow-hidden">
              <img
                src={tool.logo}
                alt={tool.name}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold text-white">{tool.name}</h1>
                {categoryInfo && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${categoryInfo.color} text-white/90`}>
                    {categoryInfo.name}
                  </span>
                )}
              </div>
              <p className="text-xl text-gray-400 mb-4">{tool.description}</p>
              <div className="flex flex-wrap items-center gap-6 text-gray-400">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-gold-400 fill-gold-400" />
                  <span className="text-white font-semibold">{tool.rating}</span>
                  <span>评分</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="text-white font-semibold">{(tool.usersCount / 1000).toFixed(0)}K+</span>
                  <span>用户</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 rounded-lg bg-dark-800 text-gray-300 text-sm border border-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>

          {tool.screenshots.length > 0 && (
            <div className="relative mb-12">
              <div className="aspect-video rounded-2xl overflow-hidden bg-dark-900 border border-gray-800">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentScreenshot}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    src={tool.screenshots[currentScreenshot]}
                    alt={`${tool.name} 截图 ${currentScreenshot + 1}`}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
              </div>

              <button
                onClick={prevScreenshot}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-dark-900/80 backdrop-blur-sm border border-gray-700 flex items-center justify-center text-white hover:bg-dark-900 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextScreenshot}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-dark-900/80 backdrop-blur-sm border border-gray-700 flex items-center justify-center text-white hover:bg-dark-900 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {tool.screenshots.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentScreenshot(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentScreenshot ? 'bg-primary-500 w-6' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card mb-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">核心功能</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tool.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary-400" />
                    </div>
                    <span className="text-gray-300 pt-1.5">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <h2 className="text-2xl font-bold text-white mb-6">为什么选择这款工具？</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-xl bg-dark-900/50">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-primary-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">即开即用</h3>
                  <p className="text-sm text-gray-400">无需复杂配置，订阅后立即使用</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-dark-900/50">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-secondary-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Clock className="w-7 h-7 text-secondary-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">灵活订阅</h3>
                  <p className="text-sm text-gray-400">按月/按年付费，随时取消</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-dark-900/50">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">安全可靠</h3>
                  <p className="text-sm text-gray-400">企业级安全，数据加密存储</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card sticky top-24"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">订阅方案</h2>
                <div className="flex items-center gap-2 p-1 bg-dark-900 rounded-lg">
                  <button
                    onClick={() => setIsYearly(false)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      !isYearly ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    月付
                  </button>
                  <button
                    onClick={() => setIsYearly(true)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                      isYearly ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    年付
                    <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                      省20%
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {tool.plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-dark-900/50'
                    } ${plan.recommended ? 'relative' : ''}`}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-gold-500 to-amber-500 text-white text-xs font-medium">
                        <Sparkles className="w-3 h-3" />
                        推荐
                      </span>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{plan.name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-white">
                          ¥{isYearly ? yearlyPrice(plan) : plan.price}
                        </span>
                        <span className="text-gray-500 text-sm">/{isYearly ? '年' : '月'}</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                          <Check className="w-4 h-4 text-primary-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <button
                onClick={() => (isAuthenticated ? setShowSubscribeModal(true) : navigate('/login', { state: { from: `/tool/${tool.id}` } }))}
                disabled={!selectedPlan}
                className={`w-full py-4 rounded-xl font-medium transition-all ${
                  selectedPlan
                    ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-500 hover:to-primary-400 hover:shadow-glow'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                {!isAuthenticated
                  ? '登录后订阅'
                  : selectedPlan
                    ? `订阅 ${selectedPlan.name} 方案`
                    : '请选择订阅方案'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                订阅后可随时取消，无隐藏费用
              </p>
            </motion.div>
          </div>
        </div>

        {related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-8">相关工具</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((relatedTool) => (
                <ToolCard key={relatedTool.id} tool={relatedTool} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showSubscribeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !submitting && setShowSubscribeModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-md w-full card"
            >
              <button
                onClick={() => setShowSubscribeModal(false)}
                disabled={submitting}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 p-2 overflow-hidden border border-gray-700/50">
                  <img
                    src={tool.logo}
                    alt={tool.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">确认订阅</h3>
                <p className="text-gray-400">
                  您即将订阅 {tool.name} 的 {selectedPlan?.name} 方案
                </p>
              </div>

              <div className="bg-dark-900/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">方案</span>
                  <span className="text-white font-medium">{selectedPlan?.name}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">付费周期</span>
                  <span className="text-white font-medium">{isYearly ? '年付' : '月付'}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <span className="text-gray-400">应付金额</span>
                  <span className="text-2xl font-bold gradient-text">
                    ¥{selectedPlan ? (isYearly ? yearlyPrice(selectedPlan) : selectedPlan.price) : 0}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubscribeModal(false)}
                  disabled={submitting}
                  className="flex-1 btn-outline disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSubscribe}
                  disabled={submitting}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {submitting ? '提交中...' : '确认订阅'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
