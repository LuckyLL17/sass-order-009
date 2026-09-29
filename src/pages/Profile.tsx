import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Shield,
  Bell,
  Eye,
  EyeOff,
  Camera,
  Trash2,
  Laptop,
  Smartphone,
  Tablet,
  Check,
  X
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { loginDevices } from '@/mock/user';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/utils';

type TabType = 'profile' | 'security' | 'notifications';

export default function Profile() {
  const { 
    user, 
    updateUserProfile, 
    changePassword, 
    notificationSettings, 
    updateNotificationSettings 
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '138****8888',
    location: '北京市',
    bio: '热爱技术，专注于产品设计和用户体验。致力于通过工具提升团队效率。',
  });
  const [profileLoaded, setProfileLoaded] = useState(false);

  // 用户数据在 bootstrap 后可能晚于首次渲染，回填一次服务端资料
  useEffect(() => {
    if (user && !profileLoaded) {
      setProfileForm((prev) => ({
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: prev.phone,
        location: prev.location,
        bio: prev.bio,
      }));
      setProfileLoaded(true);
    }
  }, [user, profileLoaded]);
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');
  const [profileError, setProfileError] = useState('');

  const tabs = [
    { id: 'profile' as TabType, label: '个人信息', icon: User },
    { id: 'security' as TabType, label: '安全设置', icon: Shield },
    { id: 'notifications' as TabType, label: '通知设置', icon: Bell },
  ];

  const deviceIcons = {
    laptop: Laptop,
    mobile: Smartphone,
    tablet: Tablet,
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setSaveStatus('saving');
    setProfileError('');

    try {
      await updateUserProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        location: profileForm.location,
        bio: profileForm.bio,
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      setProfileError(err instanceof ApiError ? err.message : '保存失败，请稍后重试');
    }
  };

  const handleCancelProfile = () => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: '138****8888',
      location: '北京市',
      bio: '热爱技术，专注于产品设计和用户体验。致力于通过工具提升团队效率。',
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    setPasswordError('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordStatus('saving');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的新密码不匹配');
      setPasswordStatus('error');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('密码长度至少为8个字符');
      setPasswordStatus('error');
      return;
    }

    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setPasswordStatus('success');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordStatus('idle'), 2000);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : '密码更新失败');
      setPasswordStatus('error');
    }
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    updateNotificationSettings({
      [key]: !notificationSettings[key],
    }).catch(() => undefined);
  };

  const notificationItems = [
    { key: 'subscriptionReminders' as const, name: '订阅到期提醒', desc: '订阅即将到期时发送提醒' },
    { key: 'emailNotifications' as const, name: '账单通知', desc: '新账单生成时发送通知' },
    { key: 'pushNotifications' as const, name: '团队邀请', desc: '收到团队邀请时发送通知' },
    { key: 'marketingEmails' as const, name: '促销活动', desc: '接收优惠活动和促销信息' },
    { key: 'securityAlerts' as const, name: '安全提醒', desc: '账户安全相关通知' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-950 pt-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">请先登录</h2>
          <p className="text-gray-400">登录后可查看和编辑个人信息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 pt-24">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            个人<span className="gradient-text">中心</span>
          </h1>
          <p className="text-xl text-gray-400">
            管理您的个人信息和账户设置
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="card text-center">
              <div className="relative inline-block mb-4">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-2xl object-cover mx-auto"
                />
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white hover:bg-primary-400 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
              <p className="text-gray-400 text-sm mb-4">{user.email}</p>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="badge-active">已验证</span>
                {user.teamRole === 'admin' && (
                  <span className="px-2.5 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-medium border border-gold-500/30">
                    团队管理员
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
              >
                <h3 className="text-xl font-semibold text-white mb-6">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      姓名
                    </label>
                    <input 
                      type="text" 
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      邮箱
                    </label>
                    <input 
                      type="email" 
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      手机号
                    </label>
                    <input 
                      type="tel" 
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      地区
                    </label>
                    <input 
                      type="text" 
                      name="location"
                      value={profileForm.location}
                      onChange={handleProfileChange}
                      className="input" 
                    />
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <h4 className="text-lg font-semibold text-white mb-4">个人简介</h4>
                  <textarea
                    name="bio"
                    value={profileForm.bio}
                    onChange={handleProfileChange}
                    className="input h-24 resize-none"
                  />
                </div>
                <div className="mt-6 flex items-center gap-4 flex-wrap">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saveStatus === 'saving'}
                    className="btn-primary disabled:opacity-50 flex items-center gap-2"
                  >
                    {saveStatus === 'saving' ? (
                      <>保存中...</>
                    ) : saveStatus === 'success' ? (
                      <><Check className="w-4 h-4" /> 已保存</>
                    ) : (
                      '保存更改'
                    )}
                  </button>
                  <button
                    onClick={handleCancelProfile}
                    className="btn-outline"
                  >
                    取消
                  </button>
                  {saveStatus === 'success' && (
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <Check className="w-4 h-4" /> 个人信息已更新
                    </span>
                  )}
                  {profileError && (
                    <span className="text-red-400 text-sm flex items-center gap-1">
                      <X className="w-4 h-4" /> {profileError}
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <div className="card">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary-400" />
                    修改密码
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="label">当前密码</label>
                      <div className="relative">
                        <input
                          type={showOldPassword ? 'text' : 'password'}
                          name="oldPassword"
                          value={passwordForm.oldPassword}
                          onChange={handlePasswordChange}
                          className="input pr-12"
                          placeholder="请输入当前密码"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">新密码</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          className="input pr-12"
                          placeholder="请输入新密码"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">确认新密码</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          className="input pr-12"
                          placeholder="请再次输入新密码"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    {passwordError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {passwordError}
                      </div>
                    )}
                    
                    {passwordStatus === 'success' && (
                      <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        密码修改成功！
                      </div>
                    )}
                    
                    <button 
                      onClick={handleChangePassword}
                      disabled={passwordStatus === 'saving'}
                      className="btn-primary disabled:opacity-50 flex items-center gap-2"
                    >
                      {passwordStatus === 'saving' ? (
                        '更新中...'
                      ) : (
                        '更新密码'
                      )}
                    </button>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-400" />
                    登录设备
                  </h3>
                  <div className="space-y-4">
                    {loginDevices.map((device, index) => {
                      const DeviceIcon = deviceIcons[device.type as keyof typeof deviceIcons] || Laptop;
                      return (
                        <motion.div
                          key={device.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center">
                              <DeviceIcon className="w-6 h-6 text-gray-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium">{device.name}</p>
                                {device.current && <span className="badge-active">当前设备</span>}
                              </div>
                              <p className="text-gray-500 text-sm">
                                {device.browser} · {device.location} · {device.lastActive}
                              </p>
                            </div>
                          </div>
                          {!device.current && (
                            <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-xl font-semibold text-white mb-6">双因素认证</h3>
                  <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl">
                    <div>
                      <p className="text-white font-medium">启用双因素认证</p>
                      <p className="text-gray-500 text-sm">使用身份验证器应用增强账户安全性</p>
                    </div>
                    <button 
                      onClick={() => handleNotificationToggle('securityAlerts')}
                      className={cn(
                        'w-12 h-6 rounded-full relative transition-colors',
                        notificationSettings.securityAlerts ? 'bg-primary-500' : 'bg-gray-700'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        notificationSettings.securityAlerts ? 'right-1' : 'left-1'
                      )} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
              >
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary-400" />
                  通知偏好设置
                </h3>
                <div className="space-y-4">
                  {notificationItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl"
                    >
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-gray-500 text-sm">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle(item.key)}
                        className={cn(
                          'w-12 h-6 rounded-full relative transition-colors',
                          notificationSettings[item.key] ? 'bg-primary-500' : 'bg-gray-700'
                        )}
                      >
                        <span className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                          notificationSettings[item.key] ? 'right-1' : 'left-1'
                        )} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <p className="text-gray-400 text-sm">
                    您可以随时更改通知偏好设置。我们不会向您发送垃圾邮件，您可以随时取消订阅。
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
