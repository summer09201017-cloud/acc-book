import { Category } from './schema';

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { type: 'expense', name: '飲食',  emoji: '🍱', bgColor: '#FFE4B5', group: '日常', isBuiltin: true, sortOrder: 1 },
  { type: 'expense', name: '交通',  emoji: '🚇', bgColor: '#B5E7E4', group: '日常', isBuiltin: true, sortOrder: 2 },
  { type: 'expense', name: '購物',  emoji: '🛒', bgColor: '#FFD6E7', group: '日常', isBuiltin: true, sortOrder: 3 },
  { type: 'expense', name: '娛樂',  emoji: '🎬', bgColor: '#E4D5FF', group: '享樂', isBuiltin: true, sortOrder: 4 },
  { type: 'expense', name: '居家',  emoji: '🏠', bgColor: '#D5F0FF', group: '日常', isBuiltin: true, sortOrder: 5 },
  { type: 'expense', name: '醫療',  emoji: '🏥', bgColor: '#FFD5D5', group: '健康', isBuiltin: true, sortOrder: 6 },
  { type: 'expense', name: '學習',  emoji: '📚', bgColor: '#D5FFD5', group: '成長', isBuiltin: true, sortOrder: 7 },
  { type: 'expense', name: '其他',  emoji: '❓', bgColor: '#E5E7EB', group: '其他', isBuiltin: true, sortOrder: 99 },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { type: 'income',  name: '薪水',  emoji: '💰', bgColor: '#B5E7B5', group: '固定', isBuiltin: true, sortOrder: 1 },
  { type: 'income',  name: '獎金',  emoji: '🎁', bgColor: '#FFE9A8', group: '額外', isBuiltin: true, sortOrder: 2 },
  { type: 'income',  name: '投資',  emoji: '📈', bgColor: '#B5D7FF', group: '理財', isBuiltin: true, sortOrder: 3 },
  { type: 'income',  name: '兼職',  emoji: '💼', bgColor: '#FFE4B5', group: '額外', isBuiltin: true, sortOrder: 4 },
  { type: 'income',  name: '其他',  emoji: '❓', bgColor: '#E5E7EB', group: '其他', isBuiltin: true, sortOrder: 99 },
];

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

// Mapping from old v1 string ids to new default category names, for migration.
export const V1_CATEGORY_MAP: Record<string, { type: 'expense' | 'income'; name: string }> = {
  food:          { type: 'expense', name: '飲食' },
  transport:     { type: 'expense', name: '交通' },
  shopping:      { type: 'expense', name: '購物' },
  entertainment: { type: 'expense', name: '娛樂' },
  home:          { type: 'expense', name: '居家' },
  health:        { type: 'expense', name: '醫療' },
  learning:      { type: 'expense', name: '學習' },
  salary:        { type: 'income',  name: '薪水' },
  bonus:         { type: 'income',  name: '獎金' },
  investment:    { type: 'income',  name: '投資' },
  parttime:      { type: 'income',  name: '兼職' },
};
