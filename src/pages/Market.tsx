import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, LayoutGrid, SlidersHorizontal, X, Star, Users, DollarSign, Check, Tag, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import ToolCard from '@/components/ToolCard';
import { useStore } from '@/store/useStore';
import { categories } from '@/lib/categories';
import type { Category, SortOption, SubscriptionFilter, UsersRange } from '@/types';
import { cn } from '@/lib/utils';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'popular', label: '最受欢迎' },
  { value: 'rating', label: '评分最高' },
  { value: 'newest', label: '最新上架' },
  { value: 'price-low', label: '价格从低到高' },
  { value: 'price-high', label: '价格从高到低' },
  { value: 'users-desc', label: '用户数量从多到少' },
  { value: 'users-asc', label: '用户数量从少到多' },
];

const subscriptionOptions: { value: SubscriptionFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'subscribed', label: '已订阅' },
  { value: 'not-subscribed', label: '未订阅' },
  { value: 'expired', label: '已过期' },
];

const usersRangeOptions: { value: UsersRange; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'lt-10k', label: '1万以下' },
  { value: '10k-50k', label: '1万-5万' },
  { value: '50k-100k', label: '5万-10万' },
  { value: 'gt-100k', label: '10万以上' },
];

const ratingOptions = [0, 1, 2, 3, 4];

export default function Market() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    getFilteredTools,
    selectedCategory,
    searchQuery,
    sortBy,
    priceMin,
    priceMax,
    ratingMin,
    ratingMax,
    usersRange,
    selectedTags,
    subscriptionFilter,
    setSelectedCategory,
    setSearchQuery,
    setSortBy,
    setPriceRange,
    setRatingRange,
    setUsersRange,
    toggleTag,
    setSubscriptionFilter,
    clearAllFilters,
    getAllTags,
    tools,
  } = useStore();

  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    rating: true,
    users: true,
    tags: true,
    subscription: true,
  });

  const allTags = useMemo(() => getAllTags(), [getAllTags]);

  useEffect(() => {
    const categoryParam = searchParams.get('category') as Category | null;
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams, setSelectedCategory]);

  const filteredTools = getFilteredTools();

  const handleCategoryChange = useCallback((category: Category | 'all') => {
    setSelectedCategory(category);
    if (category === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams, setSelectedCategory]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategory !== 'all' ||
      searchQuery !== '' ||
      sortBy !== 'popular' ||
      priceMin !== 0 ||
      priceMax !== 1000 ||
      ratingMin !== 0 ||
      ratingMax !== 5 ||
      usersRange !== 'all' ||
      selectedTags.length > 0 ||
      subscriptionFilter !== 'all'
    );
  }, [selectedCategory, searchQuery, sortBy, priceMin, priceMax, ratingMin, ratingMax, usersRange, selectedTags, subscriptionFilter]);

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];

    if (selectedCategory !== 'all') {
      const cat = categories.find(c => c.id === selectedCategory);
      filters.push({
        key: 'category',
        label: '分类',
        value: cat?.name || selectedCategory,
        onRemove: () => handleCategoryChange('all'),
      });
    }

    if (searchQuery) {
      filters.push({
        key: 'search',
        label: '搜索',
        value: searchQuery,
        onRemove: () => setSearchQuery(''),
      });
    }

    if (priceMin > 0 || priceMax < 1000) {
      filters.push({
        key: 'price',
        label: '价格',
        value: `¥${priceMin} - ¥${priceMax}`,
        onRemove: () => setPriceRange(0, 1000),
      });
    }

    if (ratingMin > 0 || ratingMax < 5) {
      filters.push({
        key: 'rating',
        label: '评分',
        value: `${ratingMin} - ${ratingMax}星`,
        onRemove: () => setRatingRange(0, 5),
      });
    }

    if (usersRange !== 'all') {
      const opt = usersRangeOptions.find(o => o.value === usersRange);
      filters.push({
        key: 'users',
        label: '用户数',
        value: opt?.label || usersRange,
        onRemove: () => setUsersRange('all'),
      });
    }

    selectedTags.forEach(tag => {
      filters.push({
        key: `tag-${tag}`,
        label: '标签',
        value: tag,
        onRemove: () => toggleTag(tag),
      });
    });

    if (subscriptionFilter !== 'all') {
      const opt = subscriptionOptions.find(o => o.value === subscriptionFilter);
      filters.push({
        key: 'subscription',
        label: '订阅状态',
        value: opt?.label || subscriptionFilter,
        onRemove: () => setSubscriptionFilter('all'),
      });
    }

    if (sortBy !== 'popular') {
      const opt = sortOptions.find(o => o.value === sortBy);
      filters.push({
        key: 'sort',
        label: '排序',
        value: opt?.label || sortBy,
        onRemove: () => setSortBy('popular'),
      });
    }

    return filters;
  }, [selectedCategory, searchQuery, priceMin, priceMax, ratingMin, ratingMax, usersRange, selectedTags, subscriptionFilter, sortBy, handleCategoryChange, setSearchQuery, setPriceRange, setRatingRange, setUsersRange, toggleTag, setSubscriptionFilter, setSortBy]);

  const handleClearFilters = () => {
    clearAllFilters();
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-dark-950 pt-24">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            工具<span className="gradient-text">市场</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            探索精选的SaaS工具，按需订阅，灵活高效
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col lg:flex-row gap-4 mb-6"
        >
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="搜索工具名称、描述或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12 pr-12 text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input w-auto min-w-[180px] bg-dark-900"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'btn-outline lg:hidden',
                showFilters && 'bg-primary-500/20 border-primary-500 text-primary-400'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              筛选
            </button>
          </div>
        </motion.div>

        {activeFilters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6"
          >
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-400 flex items-center gap-1 mr-2">
                  <Filter className="w-4 h-4" />
                  已选条件:
                </span>
                {activeFilters.map(filter => (
                  <motion.span
                    key={filter.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                      'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    )}
                  >
                    <span className="text-gray-400 text-xs">{filter.label}:</span>
                    {filter.value}
                    <button
                      onClick={filter.onRemove}
                      className="ml-1 p-0.5 rounded-full hover:bg-primary-500/30 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-gray-400 hover:text-white transition-colors ml-2"
                  >
                    清除全部
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              'lg:w-72 flex-shrink-0',
              'lg:block',
              showFilters ? 'block' : 'hidden'
            )}
          >
            <div className="card sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary-400" />
                  筛选条件
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    清除
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="border-b border-gray-800 pb-4">
                  <button
                    onClick={() => toggleSection('category')}
                    className="w-full flex items-center justify-between mb-3 text-white font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-primary-400" />
                      分类筛选
                    </span>
                    {expandedSections.category ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedSections.category && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => handleCategoryChange('all')}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between text-sm',
                          selectedCategory === 'all'
                            ? 'bg-primary-500/20 text-primary-400'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <span>全部工具</span>
                        <span className="text-xs">{tools.length}</span>
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryChange(category.id as Category)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between text-sm',
                            selectedCategory === category.id
                              ? 'bg-primary-500/20 text-primary-400'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          )}
                        >
                          <span>{category.name}</span>
                          <span className="text-xs">
                            {tools.filter(t => t.category === category.id).length}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-800 pb-4">
                  <button
                    onClick={() => toggleSection('price')}
                    className="w-full flex items-center justify-between mb-3 text-white font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary-400" />
                      价格区间
                    </span>
                    {expandedSections.price ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedSections.price && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 block mb-1">最低价</label>
                          <input
                            type="number"
                            value={priceMin}
                            onChange={(e) => setPriceRange(Math.max(0, Number(e.target.value)), priceMax)}
                            className="input w-full text-sm py-2 bg-dark-900"
                            min="0"
                            max={priceMax}
                          />
                        </div>
                        <span className="text-gray-500 mt-4">-</span>
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 block mb-1">最高价</label>
                          <input
                            type="number"
                            value={priceMax}
                            onChange={(e) => setPriceRange(priceMin, Math.max(priceMin, Number(e.target.value)))}
                            className="input w-full text-sm py-2 bg-dark-900"
                            min={priceMin}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {[
                          { label: '免费', min: 0, max: 0 },
                          { label: '¥0-50', min: 0, max: 50 },
                          { label: '¥50-200', min: 50, max: 200 },
                          { label: '¥200+', min: 200, max: 1000 },
                        ].map(preset => (
                          <button
                            key={preset.label}
                            onClick={() => setPriceRange(preset.min, preset.max)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                              priceMin === preset.min && priceMax === preset.max
                                ? 'bg-primary-500/30 text-primary-400 border border-primary-500/50'
                                : 'bg-dark-900 text-gray-400 hover:text-white border border-gray-700'
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-800 pb-4">
                  <button
                    onClick={() => toggleSection('rating')}
                    className="w-full flex items-center justify-between mb-3 text-white font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary-400" />
                      评分筛选
                    </span>
                    {expandedSections.rating ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedSections.rating && (
                    <div className="space-y-2">
                      {ratingOptions.map((rating) => (
                        <button
                          key={rating}
                          onClick={() => {
                            if (ratingMin === rating && ratingMax === 5) {
                              setRatingRange(0, 5);
                            } else {
                              setRatingRange(rating, 5);
                            }
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm',
                            ratingMin === rating && ratingMax === 5
                              ? 'bg-primary-500/20 text-primary-400'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          )}
                        >
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'w-3.5 h-3.5',
                                  i < rating
                                    ? 'text-gold-400 fill-gold-400'
                                    : 'text-gray-600'
                                )}
                              />
                            ))}
                          </div>
                          <span>{rating}星及以上</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-800 pb-4">
                  <button
                    onClick={() => toggleSection('users')}
                    className="w-full flex items-center justify-between mb-3 text-white font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary-400" />
                      用户数量
                    </span>
                    {expandedSections.users ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedSections.users && (
                    <div className="space-y-1.5">
                      {usersRangeOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setUsersRange(option.value)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-sm',
                            usersRange === option.value
                              ? 'bg-primary-500/20 text-primary-400'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          )}
                        >
                          <span>{option.label}</span>
                          {usersRange === option.value && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-800 pb-4">
                  <button
                    onClick={() => toggleSection('tags')}
                    className="w-full flex items-center justify-between mb-3 text-white font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary-400" />
                      标签筛选
                      {selectedTags.length > 0 && (
                        <span className="text-xs bg-primary-500/30 text-primary-400 px-1.5 py-0.5 rounded-full">
                          {selectedTags.length}
                        </span>
                      )}
                    </span>
                    {expandedSections.tags ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedSections.tags && (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                            selectedTags.includes(tag)
                              ? 'bg-primary-500/20 text-primary-400 border-primary-500/50'
                              : 'bg-dark-900 text-gray-400 hover:text-white border-gray-700 hover:border-gray-600'
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => toggleSection('subscription')}
                    className="w-full flex items-center justify-between mb-3 text-white font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary-400" />
                      订阅状态
                    </span>
                    {expandedSections.subscription ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedSections.subscription && (
                    <div className="space-y-1.5">
                      {subscriptionOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSubscriptionFilter(option.value)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between text-sm',
                            subscriptionFilter === option.value
                              ? 'bg-primary-500/20 text-primary-400'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          )}
                        >
                          <span>{option.label}</span>
                          {subscriptionFilter === option.value && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-2">筛选结果</h4>
                <p className="text-2xl font-bold text-white">
                  {filteredTools.length} <span className="text-gray-400 text-base font-normal">个工具</span>
                </p>
              </div>
            </div>
          </motion.aside>

          <div className="flex-1">
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTools.map((tool, index) => (
                  <ToolCard key={tool.id} tool={tool} index={index} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-800 flex items-center justify-center">
                  <Search className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">未找到相关工具</h3>
                <p className="text-gray-400 mb-6">尝试调整搜索关键词或筛选条件</p>
                <button onClick={handleClearFilters} className="btn-primary">
                  清除筛选条件
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
