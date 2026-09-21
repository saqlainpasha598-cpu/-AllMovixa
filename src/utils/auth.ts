import { User } from '../types';
import { syncWatchHistoryOnLogin } from './userHistory';

const AUTH_STORAGE_KEY = 'stream_app_current_user';
const USERS_LIST_STORAGE_KEY = 'stream_app_registered_users';

const DEFAULT_USERS: User[] = [
  {
    id: 'user-default-1',
    name: 'Saqlain Pasha',
    email: 'saqlainpasha598@gmail.com',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'user-demo-2',
    name: 'Stream Member',
    email: 'user@stream.com',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    createdAt: Date.now() - 86400000 * 10,
  },
];

export function getRegisteredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_LIST_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USERS;
  }
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null; // Guest user by default! Watching is open to everyone.
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function loginUser(email: string): User {
  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  let targetUser: User;
  if (existing) {
    targetUser = existing;
  } else {
    // Create new user if registering via login form
    const nameFromEmail = normalizedEmail.split('@')[0] || 'User';
    targetUser = {
      id: `user-${Date.now()}`,
      name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
      email: normalizedEmail,
      role: 'user',
      createdAt: Date.now(),
    };
    const updatedUsers = [...users, targetUser];
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updatedUsers));
  }

  setCurrentUser(targetUser);
  syncWatchHistoryOnLogin(targetUser.email);
  return targetUser;
}

export function registerUser(name: string, email: string): User {
  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  let targetUser: User;
  if (existing) {
    targetUser = {
      ...existing,
      name: name.trim() || existing.name,
    };
    const updatedUsers = users.map((u) => (u.email === normalizedEmail ? targetUser : u));
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updatedUsers));
  } else {
    targetUser = {
      id: `user-${Date.now()}`,
      name: name.trim() || 'New User',
      email: normalizedEmail,
      role: 'user',
      createdAt: Date.now(),
    };
    const updatedUsers = [...users, targetUser];
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updatedUsers));
  }

  setCurrentUser(targetUser);
  syncWatchHistoryOnLogin(targetUser.email);
  return targetUser;
}

export function logoutUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
