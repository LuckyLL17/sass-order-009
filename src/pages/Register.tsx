import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Zap, User, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Register() {
  const { register, authError, clearAuthError } = useStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不匹配');
      return;
    }

    if (formData.password.length < 8) {
      setError('密码长度至少为8个字符');
      return;
    }

    setError('');
    setIsLoading(true);

    const success = await register(formData.name, formData.email, formData.password);

    if (success) {
      navigate('/');
    } else {
      setError(authError || '注册失败，请检查输入信息');
    }

    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const passwordStrength = [
    { label: '至少8个字符', valid: formData.password.length >= 8 },
    { label: '包含数字', valid: /\d/.test(formData.password) },
    { label: '包含字母', valid: /[a-zA-Z]/.test(formData.password) },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-hero-pattern" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <div className="card p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">创建账户</h1>
            <p className="text-gray-400">开始您的 SubHub 之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">姓名</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="您的姓名"
                  className="input pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">邮箱地址</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="input pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pl-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {formData.password && (
                <div className="mt-3 space-y-1.5">
                  {passwordStrength.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className={cn(
                        'w-4 h-4',
                        item.valid ? 'text-green-400' : 'text-gray-600'
                      )} />
                      <span className={item.valid ? 'text-green-400' : 'text-gray-500'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">确认密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pl-12 pr-12"
                  required
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">密码不匹配</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-dark-900 text-primary-500 focus:ring-primary-500"
                required
              />
              <label htmlFor="agreeTerms" className="text-sm text-gray-400">
                我已阅读并同意{' '}
                <a href="#" className="text-primary-400 hover:text-primary-300">服务条款</a>
                {' '}和{' '}
                <a href="#" className="text-primary-400 hover:text-primary-300">隐私政策</a>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {!error && authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || formData.password !== formData.confirmPassword}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '注册中...' : '创建账户'}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-8">
            已有账户？{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              立即登录
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
