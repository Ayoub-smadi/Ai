export type UserAccount = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  createdAt: string;
};

export type UserProfile = UserAccount & {
  chatHistory?: unknown[];
  landscapePlan?: unknown;
  irrigationPlan?: unknown;
};

const ACCOUNTS_KEY = 'qadri-user-accounts-v1';
const CURRENT_USER_KEY = 'qadri-current-user-v1';
const CLIENTS_KEY = 'qadri-admin-clients-v1';

function readAccounts(): UserAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(value)
      ? value
        .filter((item): item is UserAccount => Boolean(item && typeof item.id === 'string' && (typeof item.phone === 'string' || typeof item.email === 'string')))
        .map((item) => ({ ...item, phone: typeof item.phone === 'string' ? item.phone : '', address: typeof item.address === 'string' ? item.address : '' }))
      : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: UserAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function syncAccountToClients(account: UserAccount) {
  try {
    const value = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
    const clients = Array.isArray(value) ? value : [];
    const accountClient = {
      id: `account-${account.id}`,
      accountId: account.id,
      kind: 'individual',
      name: account.name,
      contactPerson: '',
      phone: account.phone,
      email: '',
      address: account.address || '',
      website: '',
      taxNumber: '',
      notes: 'حساب عميل مسجل من الموقع.',
      createdAt: account.createdAt,
      transactions: [],
    };
    const existingIndex = clients.findIndex((client) => client.accountId === account.id || client.id === accountClient.id);
    const next = [...clients];
    if (existingIndex >= 0) next[existingIndex] = { ...next[existingIndex], ...accountClient };
    else next.unshift(accountClient);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('qadri-clients-updated'));
  } catch {
    // Account creation remains available even if the optional local contact index is unavailable.
  }
}

export function getRegisteredAccounts() {
  return readAccounts();
}

export function normalizePhone(phone: string) {
  return phone.trim().replace(/[\s().-]/g, '');
}

export function getCurrentAccount(): UserAccount | null {
  const id = localStorage.getItem(CURRENT_USER_KEY);
  if (!id) return null;
  return readAccounts().find((account) => account.id === id) || null;
}

export function registerAccount(name: string, phone: string): { account?: UserAccount; error?: string } {
  const cleanName = name.trim();
  const cleanPhone = normalizePhone(phone);
  if (cleanName.length < 2) return { error: 'اكتب اسمًا صحيحًا من حرفين على الأقل.' };
  if (!/^\+?\d{8,15}$/.test(cleanPhone)) return { error: 'اكتب رقم هاتف صحيحًا من 8 إلى 15 رقمًا.' };
  const accounts = readAccounts();
  if (accounts.some((account) => account.phone === cleanPhone)) return { error: 'هذا الرقم مسجل مسبقًا. سجّل الدخول بدلًا من إنشاء حساب جديد.' };
  const account: UserAccount = { id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: cleanName, phone: cleanPhone, address: '', createdAt: new Date().toISOString() };
  writeAccounts([...accounts, account]);
  localStorage.setItem(CURRENT_USER_KEY, account.id);
  syncAccountToClients(account);
  window.dispatchEvent(new Event('qadri-account-updated'));
  return { account };
}

export function updateAccountProfile(id: string, patch: Partial<Pick<UserAccount, 'name' | 'phone' | 'address'>>): { account?: UserAccount; error?: string } {
  const accounts = readAccounts();
  const current = accounts.find((account) => account.id === id);
  if (!current) return { error: 'الحساب غير موجود.' };
  const name = (patch.name ?? current.name).trim();
  const phone = normalizePhone(patch.phone ?? current.phone);
  const address = (patch.address ?? current.address ?? '').trim();
  if (name.length < 2) return { error: 'اكتب اسمًا صحيحًا من حرفين على الأقل.' };
  if (!/^\+?\d{8,15}$/.test(phone)) return { error: 'اكتب رقم هاتف صحيحًا من 8 إلى 15 رقمًا.' };
  if (accounts.some((account) => account.id !== id && account.phone === phone)) return { error: 'رقم الهاتف مستخدم في حساب آخر.' };
  const account = { ...current, name, phone, address };
  writeAccounts(accounts.map((item) => item.id === id ? account : item));
  syncAccountToClients(account);
  window.dispatchEvent(new Event('qadri-account-updated'));
  return { account };
}

export function loginAccount(phone: string): { account?: UserAccount; error?: string } {
  const cleanPhone = normalizePhone(phone);
  const account = readAccounts().find((item) => item.phone === cleanPhone);
  if (!account) return { error: 'لم نعثر على حساب بهذا الرقم. أنشئ حسابًا أولًا.' };
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
