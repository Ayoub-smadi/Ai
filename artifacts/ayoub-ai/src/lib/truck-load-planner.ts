export type DraftItem = { id: string; name: string; quantity: string; weightKg: string };
export type PlannerDraft = { capacityTons: string; items: DraftItem[] };
export type ManifestLine = { id: string; name: string; quantity: number; weightKg: number; lineTotalKg: number };
export type TruckManifest = { number: number; totalKg: number; lines: ManifestLine[] };
export type LoadPlan = { capacityKg: number; totalKg: number; totalTrees: number; trucks: TruckManifest[]; oversized: ManifestLine[]; incompleteRows: number };

/**
 * Creates a best-fit decreasing plan. Every assigned tree is counted once and
 * no truck's aggregate tree weight can exceed the entered capacity.
 */
export function calculatePlan(draft: PlannerDraft): LoadPlan {
  const capacityKg = Number(draft.capacityTons) * 1000;
  const plan: LoadPlan = { capacityKg: Number.isFinite(capacityKg) && capacityKg > 0 ? capacityKg : 0, totalKg: 0, totalTrees: 0, trucks: [], oversized: [], incompleteRows: 0 };
  if (!plan.capacityKg) return plan;

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
    if (weightKg > plan.capacityKg + 0.000001) plan.oversized.push(line);
    else validItems.push(line);
  }

  // Best-fit decreasing: place heavier trees first, filling the closest truck that still has room.
  const sortedItems = [...validItems].sort((a, b) => b.weightKg - a.weightKg || a.name.localeCompare(b.name, 'ar'));
  const bins: Array<{ totalKg: number; lines: Map<string, ManifestLine> }> = [];
  const epsilon = 0.000001;
  for (const item of sortedItems) {
    let remaining = item.quantity;
    while (remaining > 0) {
      let bestIndex = -1;
      let smallestFree = Number.POSITIVE_INFINITY;
      for (let index = 0; index < bins.length; index += 1) {
        const free = plan.capacityKg - bins[index].totalKg;
        if (free + epsilon >= item.weightKg && free < smallestFree) {
          bestIndex = index;
          smallestFree = free;
        }
      }

      if (bestIndex < 0) {
        const perTruck = Math.floor((plan.capacityKg + epsilon) / item.weightKg);
        if (perTruck < 1) break;
        const quantity = Math.min(remaining, perTruck);
        const bin = { totalKg: quantity * item.weightKg, lines: new Map<string, ManifestLine>() };
        bin.lines.set(item.id, { ...item, quantity, lineTotalKg: quantity * item.weightKg });
        bins.push(bin);
        remaining -= quantity;
        continue;
      }

      const bin = bins[bestIndex];
      const slots = Math.floor((plan.capacityKg - bin.totalKg + epsilon) / item.weightKg);
      const quantity = Math.min(remaining, Math.max(1, slots));
      const line = bin.lines.get(item.id);
      if (line) {
        line.quantity += quantity;
        line.lineTotalKg += quantity * item.weightKg;
      } else {
        bin.lines.set(item.id, { ...item, quantity, lineTotalKg: quantity * item.weightKg });
      }
      bin.totalKg += quantity * item.weightKg;
      remaining -= quantity;
    }
  }

  plan.trucks = bins.map((bin, index) => ({ number: index + 1, totalKg: bin.totalKg, lines: [...bin.lines.values()] }));
  return plan;
}
