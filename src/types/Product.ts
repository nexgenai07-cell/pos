import type { Weekday } from "@/lib/weekday";
import type { Deal } from "@/lib/deals";

export interface Category {
  id: string;
  branchId: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  image: string;
  isAvailable: boolean;
  badge?: "New" | "Popular" | "Deal" | null;
  /** Days this item shows on the customer menu. Undefined/empty = every day. */
  days?: Weekday[];
  /** Limited-time special price, active only during specific day+time windows. */
  deal?: Deal;
}
