import type { Category, Product } from "@/types";
import { CATEGORIES } from "@/mocks/categories";
import { PRODUCTS } from "@/mocks/products";
import { RECIPES } from "@/mocks/recipes";
import { emit } from "@/lib/eventBus";
import { isAvailableToday, todayWeekday, type Weekday } from "@/lib/weekday";
import { activeDealPrice, type Deal } from "@/lib/deals";

/**
 * Every function here is async and wraps mock, in-memory data today.
 * Components only ever call these — never import the mocks directly —
 * so swapping to a real backend later means rewriting the inside of
 * this file to use fetch(), with zero changes to any component.
 * See docs/architecture-plan.md §07.
 */

export type ProductWithCategory = Product & { categoryName: string };

function categoryName(categoryId: string): string {
  return CATEGORIES.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
}

function enrich(product: Product): ProductWithCategory {
  return { ...product, categoryName: categoryName(product.categoryId) };
}

export async function getCategories(): Promise<Category[]> {
  return [...CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProducts(): Promise<ProductWithCategory[]> {
  return PRODUCTS.map(enrich);
}

export async function getProductById(id: string): Promise<ProductWithCategory | undefined> {
  const product = PRODUCTS.find((item) => item.id === id);
  return product ? enrich(product) : undefined;
}

export type DealRow = ProductWithCategory & { deal: Deal };

/** Every product that currently has a deal configured, regardless of whether it's active right now. */
export async function getDeals(): Promise<DealRow[]> {
  return PRODUCTS.filter((product): product is Product & { deal: Deal } => Boolean(product.deal)).map((product) => ({
    ...enrich(product),
    deal: product.deal as Deal,
  }));
}

/** Creates or replaces the deal on a product. */
export async function setProductDeal(productId: string, deal: Deal): Promise<ProductWithCategory> {
  return updateProduct(productId, { deal });
}

/** Removes a product's deal, leaving the rest of the product untouched. */
export async function removeProductDeal(productId: string): Promise<ProductWithCategory> {
  return updateProduct(productId, { deal: undefined });
}

export type CustomerMenuProduct = ProductWithCategory & { originalPrice?: number; onDeal: boolean };

export interface CustomerMenuCategory {
  category: Category;
  products: CustomerMenuProduct[];
}

function withDealPrice(product: ProductWithCategory, date: Date): CustomerMenuProduct {
  const dealPrice = activeDealPrice(product.deal, date);
  if (dealPrice === undefined) return { ...product, onDeal: false };
  return { ...product, price: dealPrice, originalPrice: product.price, onDeal: true, badge: "Deal" };
}

/**
 * What a customer would see on today's QR/website menu right now — available
 * items whose day schedule includes today, with any active deal price
 * applied, grouped by category. Used by the admin "today's customer menu"
 * preview on the Menu page; the regular getProducts()/getProductById() stay
 * un-decorated since the product edit form needs the real base price.
 */
export async function getCustomerMenu(date: Date = new Date()): Promise<CustomerMenuCategory[]> {
  const todaysProducts = PRODUCTS.filter((product) => product.isAvailable && isAvailableToday(product.days, date))
    .map(enrich)
    .map((product) => withDealPrice(product, date));
  return [...CATEGORIES]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      category,
      products: todaysProducts.filter((product) => product.categoryId === category.id),
    }))
    .filter((group) => group.products.length > 0);
}

export { todayWeekday };

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface ProductInput {
  name: string;
  categoryId: string;
  description: string;
  price: number;
  costPrice: number;
  image: string;
  isAvailable: boolean;
  badge?: "New" | "Popular" | null;
  branchId?: string;
  /** Days this item shows on the customer menu. Undefined/empty = every day. */
  days?: Weekday[];
  /** Limited-time special price, active only during specific day+time windows. */
  deal?: Deal;
}

function assertProductInput(input: Pick<ProductInput, "name" | "categoryId" | "price" | "costPrice" | "deal">) {
  if (!input.name.trim()) throw new Error("Product name is required.");
  if (!input.categoryId) throw new Error("Pick a category for this product.");
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error("Price must be zero or more.");
  if (!Number.isFinite(input.costPrice) || input.costPrice < 0) throw new Error("Cost must be zero or more.");

  if (input.deal) {
    if (!Number.isFinite(input.deal.price) || input.deal.price < 0) throw new Error("Deal price must be zero or more.");
    if (input.deal.price >= input.price) throw new Error("Deal price must be less than the regular price.");
    if (input.deal.windows.length === 0) throw new Error("Add at least one day and time window for the deal.");
    for (const window of input.deal.windows) {
      if (window.startTime >= window.endTime) throw new Error("Each deal window's start time must be before its end time.");
    }
  }
}

export async function createProduct(input: ProductInput): Promise<ProductWithCategory> {
  assertProductInput(input);

  const duplicate = PRODUCTS.find((product) => product.name.trim().toLowerCase() === input.name.trim().toLowerCase());
  if (duplicate) throw new Error(`"${input.name.trim()}" already exists on the menu.`);

  const product: Product = {
    id: generateId("p"),
    branchId: input.branchId ?? "default",
    categoryId: input.categoryId,
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price,
    costPrice: input.costPrice,
    image: input.image.trim(),
    isAvailable: input.isAvailable,
    badge: input.badge ?? null,
    days: input.days && input.days.length > 0 ? input.days : undefined,
    deal: input.deal,
  };

  PRODUCTS.push(product);
  emit("product:updated", { id: product.id });
  return enrich(product);
}

export async function updateProduct(id: string, updates: Partial<ProductInput>): Promise<ProductWithCategory> {
  const product = PRODUCTS.find((entry) => entry.id === id);
  if (!product) throw new Error(`Product ${id} not found`);

  const merged: Product = {
    ...product,
    ...updates,
    name: (updates.name ?? product.name).trim(),
    description: (updates.description ?? product.description).trim(),
    image: (updates.image ?? product.image).trim(),
    days: updates.days !== undefined ? (updates.days.length > 0 ? updates.days : undefined) : product.days,
  };
  assertProductInput(merged);

  Object.assign(product, merged);
  emit("product:updated", { id: product.id });
  return enrich(product);
}

/** Deleting a product also drops its recipe — an orphaned recipe costs nothing but confuses everyone. */
export async function deleteProduct(id: string): Promise<void> {
  const index = PRODUCTS.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error(`Product ${id} not found`);

  PRODUCTS.splice(index, 1);

  const recipeIndex = RECIPES.findIndex((recipe) => recipe.productId === id);
  if (recipeIndex !== -1) RECIPES.splice(recipeIndex, 1);

  emit("product:updated", { id });
}

export interface CategoryInput {
  name: string;
  sortOrder?: number;
  branchId?: string;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");
  if (CATEGORIES.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`"${name}" already exists.`);
  }

  const category: Category = {
    id: generateId("cat"),
    branchId: input.branchId ?? "default",
    name,
    sortOrder: input.sortOrder ?? CATEGORIES.length + 1,
  };
  CATEGORIES.push(category);
  emit("product:updated", { id: category.id });
  return category;
}

export async function updateCategory(id: string, updates: Partial<CategoryInput>): Promise<Category> {
  const category = CATEGORIES.find((entry) => entry.id === id);
  if (!category) throw new Error(`Category ${id} not found`);

  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) throw new Error("Category name is required.");
    category.name = name;
  }
  if (updates.sortOrder !== undefined) category.sortOrder = updates.sortOrder;

  emit("product:updated", { id: category.id });
  return category;
}

/** Blocks deleting a category that still has menu items in it. */
export async function deleteCategory(id: string): Promise<void> {
  const index = CATEGORIES.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error(`Category ${id} not found`);

  const productCount = PRODUCTS.filter((product) => product.categoryId === id).length;
  if (productCount > 0) {
    throw new Error(`${productCount} product${productCount === 1 ? "" : "s"} still use this category — move them first.`);
  }

  CATEGORIES.splice(index, 1);
  emit("product:updated", { id });
}
