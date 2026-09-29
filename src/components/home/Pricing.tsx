import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { pricingPlans } from '@/lib/pricing';

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-dark-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            简单透明的<span className="gradient-text">定价</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            选择适合您团队规模的方案，随时可以升级或降级
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative ${
                plan.recommended ? 'md:-mt-4 md:mb-4' : ''
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    最受欢迎
                  </span>
                </div>
              )}
              
              <div
                className={`card h-full flex flex-col ${
                  plan.recommended
                    ? 'border-primary-500/50 bg-gradient-to-b from-primary-500/10 to-dark-800/50 shadow-glow'
                    : ''
                }`}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-400">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white">
                      ¥{plan.price}
                    </span>
                    <span className="text-gray-500">/月</span>
                  </div>
                  {plan.price > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      年付享8折优惠
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300">
                      <Check className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-4 rounded-xl font-medium transition-all ${
                    plan.recommended
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-500 hover:to-primary-400 hover:shadow-glow'
                      : 'bg-white/5 text-white hover:bg-white/10 border border-gray-700'
                  }`}
                >
                  {plan.price === 0 ? '免费开始' : '立即订阅'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gray-400 mb-4">需要更大规模的企业解决方案？</p>
          <button className="text-primary-400 hover:text-primary-300 font-medium inline-flex items-center gap-2">
            联系我们的销售团队
            <Check className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
