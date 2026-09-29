import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Palette, Code2, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';

const iconMap: Record<string, typeof Palette> = {
  Palette,
  Code2,
  TrendingUp,
  Users,
};

export default function Categories() {
  const categories = useStore((s) => s.categories);
  return (
    <section className="py-24 bg-dark-950 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900/50 to-transparent" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            覆盖<span className="gradient-text">全品类</span>工具
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            从设计到开发，从营销到协作，满足您团队的所有需求
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = iconMap[category.icon];
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <Link
                  to={`/market?category=${category.id}`}
                  className="card-hover block group h-full"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {category.name}
                  </h3>
                  
                  <p className="text-gray-400 mb-6">
                    精选行业顶级工具，助力团队高效协作
                  </p>
                  
                  <div className="flex items-center gap-2 text-primary-400 font-medium group-hover:gap-3 transition-all">
                    浏览工具
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
