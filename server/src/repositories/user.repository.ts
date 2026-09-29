import { getDb } from '../db/index.js';
import type { UserDTO } from '../types.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  phone: string;
  location: string;
  bio: string;
  settings: string;
  created_at: string;
  updated_at: string;
}

function toDTO(row: UserRow): UserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    phone: row.phone,
    location: row.location,
    bio: row.bio,
    settings: safeParse(row.settings),
    createdAt: row.created_at,
  };
}

function safeParse(raw: string): Record<string, boolean> {
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export const userRepository = {
  findByEmail(email: string): (UserRow & { dto: UserDTO }) | undefined {
    const row = getDb()
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;
    return row ? { ...row, dto: toDTO(row) } : undefined;
  },

  findById(id: string): (UserRow & { dto: UserDTO }) | undefined {
    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? { ...row, dto: toDTO(row) } : undefined;
  },

  create(data: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    avatar: string;
  }): UserDTO {
    getDb()
      .prepare(
        `INSERT INTO users (id, name, email, password, avatar)
         VALUES (@id, @name, @email, @password, @avatar)`
      )
      .run({
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.passwordHash,
        avatar: data.avatar,
      });
    return this.findById(data.id)!.dto;
  },

  updateProfile(
    id: string,
    updates: { name?: string; email?: string; avatar?: string; phone?: string; location?: string; bio?: string }
  ): UserDTO {
    const current = this.findById(id);
    if (!current) throw new Error('user not found');
    const merged = {
      name: updates.name ?? current.name,
      email: updates.email ?? current.email,
      avatar: updates.avatar ?? current.avatar,
      phone: updates.phone ?? current.phone,
      location: updates.location ?? current.location,
      bio: updates.bio ?? current.bio,
    };
    getDb()
      .prepare(
        `UPDATE users
         SET name = @name, email = @email, avatar = @avatar,
             phone = @phone, location = @location, bio = @bio,
             updated_at = datetime('now')
         WHERE id = @id`
      )
      .run({ id, ...merged });
    return this.findById(id)!.dto;
  },

  updatePassword(id: string, passwordHash: string) {
    getDb()
      .prepare(`UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(passwordHash, id);
  },

  updateSettings(id: string, settings: Record<string, boolean>) {
    getDb()
      .prepare(`UPDATE users SET settings = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(JSON.stringify(settings), id);
  },
};
