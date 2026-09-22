import type { Recipe, RecipeItem } from "@/types";
import { RECIPES } from "@/mocks/recipes";
import { adjustStock } from "@/lib/api/inventory";

export async function getRecipes(): Promise<Recipe[]> {
  return RECIPES;
}

export async function getRecipeForProduct(productId: string): Promise<Recipe | undefined> {
  return RECIPES.find((recipe) => recipe.productId === productId);
}

export async function setRecipeForProduct(productId: string, items: RecipeItem[]): Promise<Recipe> {
  const existing = RECIPES.find((recipe) => recipe.productId === productId);
  if (existing) {
    existing.items = items;
    return existing;
  }
  const recipe: Recipe = { productId, items };
  RECIPES.push(recipe);
  return recipe;
}

/** Removes the recipe entirely (rather than leaving an empty one behind). */
export async function deleteRecipeForProduct(productId: string): Promise<void> {
  const index = RECIPES.findIndex((recipe) => recipe.productId === productId);
  if (index !== -1) RECIPES.splice(index, 1);
}

/**
 * Deducts ingredient stock for one fired order item, per its recipe.
 * Called from lib/api/orders.ts sendToKitchen — deduction happens on
 * "fired," not on placement or completion. See docs/architecture-plan.md §11.
 */
export async function deductStockForOrderItem(productId: string, quantity: number, orderId: string): Promise<void> {
  const recipe = await getRecipeForProduct(productId);
  if (!recipe) return;
  for (const item of recipe.items) {
    await adjustStock(item.inventoryItemId, -item.quantity * quantity, "sale", orderId);
  }
}
