import React from 'react';
import {
  HelpCircle,
  Utensils, Coffee, Pizza, Beer, Cake, IceCream, Sandwich,
  Bus, Car, Plane, Train, Bike, Fuel,
  ShoppingCart, ShoppingBag, Gift, Shirt, Glasses,
  Home, Bed, Lightbulb, Wrench,
  Heart, HeartPulse, Pill, Stethoscope,
  Book, GraduationCap, PenTool, Library,
  Film, Music, Gamepad2, Tv, Camera,
  Wallet, Banknote, CreditCard, PiggyBank, TrendingUp, Briefcase, DollarSign,
  Smartphone, Laptop, Wifi, Cloud,
  Dog, Cat, Baby, Users, Sparkles, Star,
  Dumbbell, Leaf, Sun, Moon,
  Building2, Undo2,
  type LucideIcon,
} from 'lucide-react';
import { Category } from '../db/schema';

type CategoryLike = Pick<Category, 'emoji' | 'bgColor'> & { iconName?: string };

// Curated icon set the picker exposes. Keys are the strings stored in Category.iconName.
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  HelpCircle,
  Utensils, Coffee, Pizza, Beer, Cake, IceCream, Sandwich,
  Bus, Car, Plane, Train, Bike, Fuel,
  ShoppingCart, ShoppingBag, Gift, Shirt, Glasses,
  Home, Bed, Lightbulb, Wrench,
  Heart, HeartPulse, Pill, Stethoscope,
  Book, GraduationCap, PenTool, Library,
  Film, Music, Gamepad2, Tv, Camera,
  Wallet, Banknote, CreditCard, PiggyBank, TrendingUp, Briefcase, DollarSign,
  Smartphone, Laptop, Wifi, Cloud,
  Dog, Cat, Baby, Users, Sparkles, Star,
  Dumbbell, Leaf, Sun, Moon,
  Building2, Undo2,
};

export const ICON_NAMES = Object.keys(ICON_REGISTRY);

interface Props {
  category?: CategoryLike;
  size?: number;
  className?: string;
  fallbackBg?: string;
}

export const CategoryIcon: React.FC<Props> = ({
  category,
  size = 40,
  className = '',
  fallbackBg = '#E5E7EB',
}) => {
  const emoji = (category?.emoji ?? '').trim();
  const iconName = category?.iconName;
  const bg = category?.bgColor ?? fallbackBg;
  const fontSize = Math.round(size * 0.55);
  const strokePx = Math.max(14, Math.round(size * 0.5));

  let content: React.ReactNode;
  if (emoji) {
    content = <span style={{ fontSize, lineHeight: 1 }}>{emoji}</span>;
  } else {
    const Icon = (iconName && ICON_REGISTRY[iconName]) || HelpCircle;
    content = <Icon size={strokePx} strokeWidth={2} />;
  }

  return (
    <span
      className={`category-icon ${className}`}
      style={{ width: size, height: size, backgroundColor: bg }}
      aria-hidden
    >
      {content}
    </span>
  );
};
