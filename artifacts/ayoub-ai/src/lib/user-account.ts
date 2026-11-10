export type UserAccount = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type UserProfile = UserAccount & {
  chatHistory?: unknown[];
  landscapePlan?: unknown;
  irrigationPlan?: unknown;
};

const ACCOUNTS_KEY = 'qadri-user-accounts-v1';
const CURRENT_USER_KEY = 'qadri-current-user-v1';

function readAccounts(): UserAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is UserAccount => Boolean(item && typeof item.id === 'string' && typeof item.email === 'string')) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: UserAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getCurrentAccount(): UserAccount | null {
  const id = localStorage.getItem(CURRENT_USER_KEY);
  if (!id) return null;
  return readAccounts().find((account) => account.id === id) || null;
}

export function registerAccount(name: string, email: string): { account?: UserAccount; error?: string } {
  const cleanName = name.trim();
  const cleanEmail = normalizeEmail(email);
  if (cleanName.length < 2) return { error: 'اكتب اسمًا صحيحًا من حرفين على الأقل.' };
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return { error: 'اكتب بريدًا إلكترونيًا صحيحًا.' };
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === cleanEmail)) return { error: 'هذا البريد مسجل مسبقًا. سجّل الدخول بدلًا من إنشاء حساب جديد.' };
  const account: UserAccount = { id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: cleanName, email: cleanEmail, createdAt: new Date().toISOString() };
  writeAccounts([...accounts, account]);
  localStorage.setItem(CURRENT_USER_KEY, account.id);
  return { account };
}

export function loginAccount(email: string): { account?: UserAccount; error?: string } {
  const cleanEmail = normalizeEmail(email);
  const account = readAccounts().find((item) => item.email === cleanEmail);
  if (!account) return { error: 'لم نعثر على حساب بهذا البريد. أنشئ حسابًا أولًا.' };
  localStorage.setItem(CURRENT_USER_KEY, account.id);
  return { account };
}

export function logoutAccount() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function userStorageKey(key: string, account = getCurrentAccount()) {
  const identity = account?.id || 'guest';
  return `${key}:${identity}`;
}

export function readUserData<T>(key: string, fallback: T, account = getCurrentAccount()): T {
  try {
    const value = localStorage.getItem(userStorageKey(key, account));
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export function saveUserData<T>(key: string, value: T, account = getCurrentAccount()) {
  localStorage.setItem(userStorageKey(key, account), JSON.stringify(value));
}

export function removeUserData(key: string, account = getCurrentAccount()) {
  localStorage.removeItem(userStorageKey(key, account));
}
