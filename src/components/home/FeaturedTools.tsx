import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import ToolCard from '@/components/ToolCard';
import { useStore } from '@/store/useStore';

export default function FeaturedTools() {
  const tools = useStore((s) => s.tools);
  const featuredTools = tools.slice(0, 4);

  return (
    <section className="py-24 bg-dark-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-gold-400" />
              <span className="text-gold-400 font-medium">精选推荐</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              热门工具
            </h2>
          </div>
          
          <Link
            to="/market"
            className="btn-outline w-fit"
          >
            查看全部
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredTools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
