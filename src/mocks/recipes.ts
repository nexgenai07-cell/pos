import type { Recipe } from "@/types";

// productId matches restaurant-website's mocks/menuData.ts ids (p1..p8) —
// two independent mock stores kept in sync by hand, per §05.
export const RECIPES: Recipe[] = [
  {
    productId: "p1", // Classic Smash Burger
    items: [
      { inventoryItemId: "inv1", quantity: 2, unit: "unit" },
      { inventoryItemId: "inv2", quantity: 1, unit: "unit" },
      { inventoryItemId: "inv3", quantity: 1, unit: "slice" },
      { inventoryItemId: "inv13", quantity: 20, unit: "ml" },
    ],
  },
  {
    productId: "p2", // Double Bacon Deluxe
    items: [
      { inventoryItemId: "inv1", quantity: 2, unit: "unit" },
      { inventoryItemId: "inv2", quantity: 1, unit: "unit" },
      { inventoryItemId: "inv4", quantity: 2, unit: "strip" },
      { inventoryItemId: "inv5", quantity: 1, unit: "slice" },
    ],
  },
  {
    productId: "p3", // Spicy Inferno Burger
    items: [
      { inventoryItemId: "inv1", quantity: 1, unit: "unit" },
      { inventoryItemId: "inv2", quantity: 1, unit: "unit" },
      { inventoryItemId: "inv6", quantity: 1, unit: "slice" },
    ],
  },
  {
    productId: "p4", // Pepperoni Supreme Pizza
    items: [
      { inventoryItemId: "inv7", quantity: 1, unit: "unit" },
      { inventoryItemId: "inv8", quantity: 180, unit: "g" },
      { inventoryItemId: "inv9", quantity: 90, unit: "g" },
    ],
  },
  {
    productId: "p5", // Margherita Pizza
    items: [
      { inventoryItemId: "inv7", quantity: 1, unit: "unit" },
      { inventoryItemId: "inv8", quantity: 160, unit: "g" },
    ],
  },
  {
    productId: "p6", // Golden Crispy Fries
    items: [{ inventoryItemId: "inv10", quantity: 220, unit: "g" }],
  },
  {
    productId: "p7", // Loaded Onion Rings
    items: [
      { inventoryItemId: "inv11", quantity: 150, unit: "g" },
      { inventoryItemId: "inv3", quantity: 1, unit: "slice" },
    ],
  },
  {
    productId: "p8", // Classic Craft Cola
    items: [{ inventoryItemId: "inv12", quantity: 40, unit: "ml" }],
  },
];
