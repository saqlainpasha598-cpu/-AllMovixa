const ADMIN_SESSION_KEY = 'stream_admin_unlocked_session';

export function isAdminSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminSessionUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {
    // Ignore storage failure
  }
}

export function clearAdminSession(): void {
  setAdminSessionUnlocked(false);
}

export async function checkAdminStatus(): Promise<{
  isDefaultPassword: boolean;
  updatedAt: number;
}> {
  try {
    const res = await fetch('/api/admin/status');
    if (res.ok) {
      const data = await res.json();
      return {
        isDefaultPassword: data.isDefaultPassword ?? true,
        updatedAt: data.updatedAt ?? Date.now(),
      };
    }
  } catch (err) {
    console.warn('Failed to check admin status:', err);
  }
  return { isDefaultPassword: true, updatedAt: Date.now() };
}

export async function verifyAdminPassword(password: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/verify-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (res.ok && data.valid) {
      setAdminSessionUnlocked(true);
      return { valid: true };
    } else {
      return { valid: false, error: data.error || 'Incorrect password. (Default is saqlainpashauplod)' };
    }
  } catch (err: any) {
    // Fallback if server is not reachable, check default 'saqlainpashauplod'
    if (password === 'saqlainpashauplod') {
      setAdminSessionUnlocked(true);
      return { valid: true };
    }
    return { valid: false, error: 'Network error or incorrect password.' };
  }
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Password changed successfully.' };
    } else {
      return { success: false, error: data.error || 'Failed to change password.' };
    }
  } catch (err: any) {
    return { success: false, error: 'Network error while attempting to change password.' };
  }
}
