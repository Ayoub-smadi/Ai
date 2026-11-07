export type DraftItem = { id: string; name: string; quantity: string; weightKg: string };
export type PlannerDraft = { truckCount: string; capacityTons: string; items: DraftItem[] };
export type ManifestLine = { id: string; name: string; quantity: number; weightKg: number; lineTotalKg: number };
export type TruckManifest = { number: number; totalKg: number; lines: ManifestLine[] };
export type LoadPlan = {
  capacityKg: number;
  requestedTrucks: number;
  totalKg: number;
  assignedKg: number;
  totalTrees: number;
  assignedTrees: number;
  unassignedKg: number;
  unassignedTrees: number;
  averageKg: number;
  balanceSpreadKg: number;
  trucks: TruckManifest[];
  oversized: ManifestLine[];
  unassigned: ManifestLine[];
  incompleteRows: number;
  invalidTruckCount: boolean;
  complete: boolean;
};

/**
 * Balances whole trees across the user-selected number of identical trucks.
 * Heavier trees are processed first; each goes to the currently lightest truck
 * that can take it without exceeding that truck's weight capacity.
 */
export function calculatePlan(draft: PlannerDraft): LoadPlan {
  const rawCapacityKg = Number(draft.capacityTons) * 1000;
  const capacityKg = Number.isFinite(rawCapacityKg) && rawCapacityKg > 0 ? rawCapacityKg : 0;
  const parsedTruckCount = Number(draft.truckCount);
  const validTruckCount = Number.isInteger(parsedTruckCount) && parsedTruckCount > 0 && parsedTruckCount <= 1000;
  const requestedTrucks = validTruckCount ? parsedTruckCount : 0;
  const plan: LoadPlan = {
    capacityKg,
    requestedTrucks,
    totalKg: 0,
    assignedKg: 0,
    totalTrees: 0,
    assignedTrees: 0,
    unassignedKg: 0,
    unassignedTrees: 0,
    averageKg: 0,
    balanceSpreadKg: 0,
    trucks: [],
    oversized: [],
    unassigned: [],
    incompleteRows: 0,
    invalidTruckCount: Boolean(draft.truckCount.trim()) && !validTruckCount,
    complete: false,
  };
  if (!capacityKg || !validTruckCount) return plan;

  const bins = Array.from({ length: requestedTrucks }, (_, index) => ({ number: index + 1, totalKg: 0, lines: new Map<string, ManifestLine>() }));
  const validItems: ManifestLine[] = [];
  for (const item of draft.items) {
    const name = item.name.trim();
    const rawQuantity = item.quantity.trim();
    const rawWeight = item.weightKg.trim();
    if (!name && !rawQuantity && !rawWeight) continue;
    const quantity = Number(rawQuantity);
    const weightKg = Number(rawWeight);
    if (!name || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(weightKg) || weightKg <= 0) {
      plan.incompleteRows += 1;
      continue;
    }
    const lineTotalKg = quantity * weightKg;
    plan.totalTrees += quantity;
    plan.totalKg += lineTotalKg;
    const line = { id: item.id, name, quantity, weightKg, lineTotalKg };
    if (weightKg > capacityKg + 0.000001) {
      plan.oversized.push(line);
      plan.unassigned.push(line);
      plan.unassignedTrees += quantity;
      plan.unassignedKg += lineTotalKg;
    } else {
      validItems.push(line);
    }
  }

  const sortedItems = [...validItems].sort((a, b) => b.weightKg - a.weightKg || a.name.localeCompare(b.name, 'ar'));
  const epsilon = 0.000001;
  for (const item of sortedItems) {
    let remaining = item.quantity;
    while (remaining > 0) {
      let lightestIndex = -1;
      let lightestWeight = Number.POSITIVE_INFINITY;
      for (let index = 0; index < bins.length; index += 1) {
        const bin = bins[index];
        if (bin.totalKg + item.weightKg <= capacityKg + epsilon && bin.totalKg < lightestWeight) {
          lightestIndex = index;
          lightestWeight = bin.totalKg;
        }
      }
      if (lightestIndex < 0) break;

      const bin = bins[lightestIndex];
      const existingLine = bin.lines.get(item.id);
      if (existingLine) {
        existingLine.quantity += 1;
        existingLine.lineTotalKg += item.weightKg;
      } else {
        bin.lines.set(item.id, { ...item, quantity: 1, lineTotalKg: item.weightKg });
      }
      bin.totalKg += item.weightKg;
      plan.assignedTrees += 1;
      plan.assignedKg += item.weightKg;
      remaining -= 1;
    }
    if (remaining > 0) {
      const line = { ...item, quantity: remaining, lineTotalKg: remaining * item.weightKg };
      plan.unassigned.push(line);
      plan.unassignedTrees += remaining;
      plan.unassignedKg += line.lineTotalKg;
    }
  }

  plan.trucks = bins.map((bin) => ({ number: bin.number, totalKg: bin.totalKg, lines: [...bin.lines.values()] }));
  plan.averageKg = plan.requestedTrucks > 0 ? plan.assignedKg / plan.requestedTrucks : 0;
  const loads = bins.map((bin) => bin.totalKg);
  plan.balanceSpreadKg = loads.length ? Math.max(...loads) - Math.min(...loads) : 0;
  plan.complete = plan.totalTrees > 0 && plan.assignedTrees === plan.totalTrees && plan.incompleteRows === 0 && plan.unassignedTrees === 0;
  return plan;
}
