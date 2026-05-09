import { Category, TransactionType } from './schema';

// Built-in defaults are emoji-only — iconName is intentionally omitted so the visual
// identity is the emoji. Custom categories can still opt into a lucide icon.
export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { type: 'expense', name: '飲食',     emoji: '🍱',         bgColor: '#FFE4B5', group: '日常', isBuiltin: true, sortOrder: 1 },
  { type: 'expense', name: '交通',     emoji: '🚇',         bgColor: '#B5E7E4', group: '日常', isBuiltin: true, sortOrder: 2 },
  { type: 'expense', name: '居家',     emoji: '🏠',         bgColor: '#D5F0FF', group: '日常', isBuiltin: true, sortOrder: 3 },
  { type: 'expense', name: '娛樂',     emoji: '🎮',         bgColor: '#E4D5FF', group: '享樂', isBuiltin: true, sortOrder: 4 },
  { type: 'expense', name: '醫療',     emoji: '💊',         bgColor: '#FFD5D5', group: '健康', isBuiltin: true, sortOrder: 5 },
  { type: 'expense', name: '購物',     emoji: '🛍️',         bgColor: '#FFD6E7', group: '日常', isBuiltin: true, sortOrder: 6 },
  { type: 'expense', name: '教育',     emoji: '📚',         bgColor: '#D5FFD5', group: '成長', isBuiltin: true, sortOrder: 7 },
  { type: 'expense', name: '旅遊',     emoji: '✈️',         bgColor: '#DCFCE7', group: '享樂', isBuiltin: true, sortOrder: 8 },
  { type: 'expense', name: '通訊',     emoji: '📱',         bgColor: '#B5D7FF', group: '固定', isBuiltin: true, sortOrder: 9 },
  { type: 'expense', name: '訂閱',     emoji: '🔔',         bgColor: '#FCE7F3', group: '固定', isBuiltin: true, sortOrder: 10 },
  { type: 'expense', name: '寵物',     emoji: '🐾',         bgColor: '#FFE9A8', group: '享樂', isBuiltin: true, sortOrder: 11 },
  { type: 'expense', name: '美容',     emoji: '💅',         bgColor: '#FCE7F3', group: '享樂', isBuiltin: true, sortOrder: 12 },
  { type: 'expense', name: '保險',     emoji: '🛡️',         bgColor: '#DBEAFE', group: '固定', isBuiltin: true, sortOrder: 13 },
  { type: 'expense', name: '稅費',     emoji: '🧾',         bgColor: '#E5E7EB', group: '固定', isBuiltin: true, sortOrder: 14 },
  { type: 'expense', name: '禮物',     emoji: '🎁',         bgColor: '#FFD6E7', group: '享樂', isBuiltin: true, sortOrder: 15 },
  { type: 'expense', name: '孝親',     emoji: '👨‍👩‍👧', bgColor: '#FFE9A8', group: '家庭', isBuiltin: true, sortOrder: 16 },
  { type: 'expense', name: '捐贈',     emoji: '💝',         bgColor: '#FFD5D5', group: '公益', isBuiltin: true, sortOrder: 17 },
  { type: 'expense', name: '運動',     emoji: '🏃',         bgColor: '#DCFCE7', group: '健康', isBuiltin: true, sortOrder: 18 },
  { type: 'expense', name: '水電瓦斯', emoji: '💡',         bgColor: '#FEF3C7', group: '固定', isBuiltin: true, sortOrder: 19 },
  { type: 'expense', name: '其他',     emoji: '📦',         bgColor: '#E5E7EB', group: '其他', isBuiltin: true, sortOrder: 99 },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { type: 'income',  name: '薪資', emoji: '💰', bgColor: '#B5E7B5', group: '固定', isBuiltin: true, sortOrder: 1 },
  { type: 'income',  name: '獎金', emoji: '🏆', bgColor: '#FFE9A8', group: '額外', isBuiltin: true, sortOrder: 2 },
  { type: 'income',  name: '投資', emoji: '📈', bgColor: '#B5D7FF', group: '理財', isBuiltin: true, sortOrder: 3 },
  { type: 'income',  name: '退款', emoji: '↩️', bgColor: '#DCFCE7', group: '額外', isBuiltin: true, sortOrder: 4 },
  { type: 'income',  name: '兼職', emoji: '💼', bgColor: '#FFE4B5', group: '額外', isBuiltin: true, sortOrder: 5 },
  { type: 'income',  name: '紅包', emoji: '🧧', bgColor: '#FFD5D5', group: '額外', isBuiltin: true, sortOrder: 6 },
  { type: 'income',  name: '利息', emoji: '🏦', bgColor: '#FCE7F3', group: '理財', isBuiltin: true, sortOrder: 7 },
  { type: 'income',  name: '租金', emoji: '🏘️', bgColor: '#DBEAFE', group: '理財', isBuiltin: true, sortOrder: 8 },
  { type: 'income',  name: '禮金', emoji: '💌', bgColor: '#FFD6E7', group: '額外', isBuiltin: true, sortOrder: 9 },
  { type: 'income',  name: '其他', emoji: '📦', bgColor: '#E5E7EB', group: '其他', isBuiltin: true, sortOrder: 99 },
];

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

// Renames applied once when promoting an older builtin row to the new spec. We keep the
// same id (and therefore all referencing transactions/budgets) and just rewrite the name.
export const BUILTIN_RENAMES: Array<{ type: TransactionType; oldName: string; newName: string }> = [
  { type: 'expense', oldName: '學習', newName: '教育' },
  { type: 'income',  oldName: '薪水', newName: '薪資' },
];

// Mapping from old v1 string ids to new default category names, for migration.
export const V1_CATEGORY_MAP: Record<string, { type: 'expense' | 'income'; name: string }> = {
  food:          { type: 'expense', name: '飲食' },
  transport:     { type: 'expense', name: '交通' },
  shopping:      { type: 'expense', name: '購物' },
  entertainment: { type: 'expense', name: '娛樂' },
  home:          { type: 'expense', name: '居家' },
  health:        { type: 'expense', name: '醫療' },
  learning:      { type: 'expense', name: '教育' },
  salary:        { type: 'income',  name: '薪資' },
  bonus:         { type: 'income',  name: '獎金' },
  investment:    { type: 'income',  name: '投資' },
  parttime:      { type: 'income',  name: '兼職' },
};

// A pastel palette presented to users when creating a custom category.
export const CATEGORY_COLOR_PALETTE = [
  '#FFE4B5', '#FFD6E7', '#FFD5D5', '#FFE9A8', '#E4D5FF',
  '#D5F0FF', '#B5E7E4', '#B5E7B5', '#D5FFD5', '#B5D7FF',
  '#E5E7EB', '#FCE7F3', '#FEF3C7', '#DBEAFE', '#DCFCE7',
];
