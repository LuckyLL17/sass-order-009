import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/errors.js';
import type { UserDTO } from '../types.js';

const DEFAULT_NOTIFICATION_SETTINGS = {
  emailNotifications: true,
  pushNotifications: true,
  subscriptionReminders: true,
  marketingEmails: false,
  securityAlerts: true,
};

export const userService = {
  updateProfile(
    userId: string,
    updates: { name?: string; email?: string; avatar?: string; phone?: string; location?: string; bio?: string }
  ): UserDTO {
    if (updates.email) {
      const existing = userRepository.findByEmail(updates.email);
      if (existing && existing.id !== userId) {
        throw AppError.conflict('该邮箱已被其他账户使用');
      }
    }
    return userRepository.updateProfile(userId, updates);
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const record = userRepository.findById(userId);
    if (!record) throw AppError.notFound('用户不存在');

    const matched = await bcrypt.compare(oldPassword, record.password);
    if (!matched) {
      throw AppError.badRequest('当前密码不正确');
    }
    userRepository.updatePassword(userId, await bcrypt.hash(newPassword, 10));
  },

  getNotificationSettings(userId: string): Record<string, boolean> {
    const record = userRepository.findById(userId);
    if (!record) throw AppError.notFound('用户不存在');
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...record.dto.settings };
  },

  updateNotificationSettings(
    userId: string,
    updates: Partial<Record<string, boolean>>
  ): Record<string, boolean> {
    const current = this.getNotificationSettings(userId);
    const next: Record<string, boolean> = { ...current };
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'boolean') next[key] = value;
    }
    userRepository.updateSettings(userId, next);
    return next;
  },
};

export { DEFAULT_NOTIFICATION_SETTINGS };
