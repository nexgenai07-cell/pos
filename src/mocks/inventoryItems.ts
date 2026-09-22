import type { InventoryItem } from "@/types";

export const INVENTORY_ITEMS: InventoryItem[] = [
  { id: "inv1", branchId: "default", name: "Beef Patty", unit: "unit", currentStock: 120, parLevel: 40, costPerUnit: 0.85, supplierId: "sup1" },
  { id: "inv2", branchId: "default", name: "Brioche Bun", unit: "unit", currentStock: 150, parLevel: 50, costPerUnit: 0.35, supplierId: "sup2" },
  { id: "inv3", branchId: "default", name: "Cheddar Cheese", unit: "slice", currentStock: 200, parLevel: 60, costPerUnit: 0.15, supplierId: "sup1" },
  { id: "inv4", branchId: "default", name: "Bacon", unit: "strip", currentStock: 100, parLevel: 30, costPerUnit: 0.25, supplierId: "sup1" },
  { id: "inv5", branchId: "default", name: "Smoked Gouda", unit: "slice", currentStock: 80, parLevel: 25, costPerUnit: 0.2, supplierId: "sup1" },
  { id: "inv6", branchId: "default", name: "Pepper-Jack Cheese", unit: "slice", currentStock: 22, parLevel: 25, costPerUnit: 0.18, supplierId: "sup1" },
  { id: "inv7", branchId: "default", name: "Pizza Dough", unit: "unit", currentStock: 60, parLevel: 20, costPerUnit: 0.9, supplierId: "sup2" },
  { id: "inv8", branchId: "default", name: "Mozzarella", unit: "g", currentStock: 5000, parLevel: 1500, costPerUnit: 0.012, supplierId: "sup1" },
  { id: "inv9", branchId: "default", name: "Pepperoni", unit: "g", currentStock: 3000, parLevel: 1000, costPerUnit: 0.02, supplierId: "sup1" },
  { id: "inv10", branchId: "default", name: "Potatoes", unit: "g", currentStock: 20000, parLevel: 5000, costPerUnit: 0.002, supplierId: "sup3" },
  { id: "inv11", branchId: "default", name: "Onions", unit: "g", currentStock: 8000, parLevel: 2000, costPerUnit: 0.0015, supplierId: "sup3" },
  { id: "inv12", branchId: "default", name: "Cola Syrup", unit: "ml", currentStock: 4000, parLevel: 1000, costPerUnit: 0.01, supplierId: "sup2" },
  { id: "inv13", branchId: "default", name: "House Sauce", unit: "ml", currentStock: 3000, parLevel: 800, costPerUnit: 0.005, supplierId: "sup1" },
];
