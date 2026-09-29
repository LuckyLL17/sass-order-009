import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/errors.js';
import { signToken } from '../middleware/auth.js';
import type { UserDTO } from '../types.js';

const DEFAULT_AVATAR =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20user%20avatar%20portrait%20simple%20minimal&image_size=square';

export interface AuthResult {
  token: string;
  user: UserDTO;
}

export const authService = {
  async register(input: { name: string; email: string; password: string }): Promise<AuthResult> {
    const existing = userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('该邮箱已被注册，请直接登录或更换邮箱');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = userRepository.create({
      id: `user_${randomUUID()}`,
      name: input.name,
      email: input.email,
      passwordHash,
      avatar: DEFAULT_AVATAR,
    });

    return { token: signToken(user), user };
  },

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const record = userRepository.findByEmail(input.email);
    // 统一错误文案，避免暴露邮箱是否已注册
    if (!record) {
      throw AppError.unauthorized('邮箱或密码不正确');
    }

    const matched = await bcrypt.compare(input.password, record.password);
    if (!matched) {
      throw AppError.unauthorized('邮箱或密码不正确');
    }

    return { token: signToken(record.dto), user: record.dto };
  },

  me(userId: string): UserDTO {
    const record = userRepository.findById(userId);
    if (!record) throw AppError.notFound('用户不存在');
    return record.dto;
  },
};
