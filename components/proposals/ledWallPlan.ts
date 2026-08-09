export type LedWallSpecification = {
  width: string;
  height: string;
  shape: string;
  pixelPitch: string;
  switcher: string;
  notes: string;
  specs: string;
};

export type LedWallPlan = {
  ledWall?: string;
  ledWallCount?: string;
  ledWalls?: LedWallSpecification[];
  ledWallWidth?: string;
  ledWallHeight?: string;
  ledWallShape?: string;
  ledWallPixelPitch?: string;
  ledWallSwitcher?: string;
  ledWallNotes?: string;
  ledWallSpecs?: string;
};

export const emptyLedWallSpecification = (): LedWallSpecification => ({
  width: "",
  height: "",
  shape: "",
  pixelPitch: "",
  switcher: "",
  notes: "",
  specs: "",
});

const stringValue = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const normalizedSpecification = (
  value: Partial<LedWallSpecification> | undefined,
): LedWallSpecification => ({
  width: stringValue(value?.width),
  height: stringValue(value?.height),
  shape: stringValue(value?.shape),
  pixelPitch: stringValue(value?.pixelPitch),
  switcher: stringValue(value?.switcher),
  notes: stringValue(value?.notes),
  specs: stringValue(value?.specs),
});

export const legacyLedWallSpecification = (
  plan: LedWallPlan,
): LedWallSpecification => ({
  width: stringValue(plan.ledWallWidth),
  height: stringValue(plan.ledWallHeight),
  shape: stringValue(plan.ledWallShape),
  pixelPitch: stringValue(plan.ledWallPixelPitch),
  switcher: stringValue(plan.ledWallSwitcher),
  notes: stringValue(plan.ledWallNotes),
  specs: stringValue(plan.ledWallSpecs),
});

const hasValue = (wall: LedWallSpecification): boolean =>
  Object.values(wall).some((value) => value.trim().length > 0);

export const ledWallCount = (plan: LedWallPlan): number => {
  if (typeof plan.ledWallCount === "string") {
    if (!plan.ledWallCount.trim()) return 0;
    const parsed = Number(plan.ledWallCount);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 20) : 0;
  }
  if (Array.isArray(plan.ledWalls) && plan.ledWalls.length > 0) {
    return Math.min(plan.ledWalls.length, 20);
  }
  return hasValue(legacyLedWallSpecification(plan)) ? 1 : 0;
};

export const normalizeLedWalls = (plan: LedWallPlan): LedWallSpecification[] => {
  const supplied = Array.isArray(plan.ledWalls)
    ? plan.ledWalls.map((wall) => normalizedSpecification(wall))
    : [];
  if (supplied.length > 0) return supplied;
  const legacy = legacyLedWallSpecification(plan);
  return hasValue(legacy) ? [legacy] : [];
};

export const ensureLedWallSlots = (
  walls: LedWallSpecification[],
  count: number,
): LedWallSpecification[] => {
  const next = walls.map((wall) => normalizedSpecification(wall));
  while (next.length < count) next.push(emptyLedWallSpecification());
  return next;
};

export const ledWallPlanMissingFields = (plan: LedWallPlan): string[] => {
  if (plan.ledWall !== "Yes") return [];
  const count = ledWallCount(plan);
  if (count < 1) return ["LED wall count"];
  const walls = ensureLedWallSlots(normalizeLedWalls(plan), count);
  const missing: string[] = [];
  walls.slice(0, count).forEach((wall, index) => {
    const label = `LED wall ${index + 1}`;
    if (!(Number(wall.width) > 0)) missing.push(`${label} width`);
    if (!(Number(wall.height) > 0)) missing.push(`${label} height`);
    if (!wall.shape.trim()) missing.push(`${label} shape`);
    if (!wall.pixelPitch.trim()) missing.push(`${label} pixel pitch`);
    if (!wall.switcher.trim()) missing.push(`${label} processor`);
  });
  return missing;
};
