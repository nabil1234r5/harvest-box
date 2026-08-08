import { db } from "@/db";
import {
  boxItems,
  deliveries,
  farms,
  farmWeekStatus,
  produceItems,
  subscribers,
  weeks,
  type Week,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { ensureSeed } from "./seed";

export type BoxSize = "small" | "medium" | "large";

export const BOX_SIZES: {
  key: BoxSize;
  label: string;
  price: number;
  serves: string;
  blurb: string;
}[] = [
  {
    key: "small",
    label: "The Half Bushel",
    price: 24,
    serves: "1–2 people",
    blurb: "A modest armful — enough for a few good dinners and a salad or two.",
  },
  {
    key: "medium",
    label: "The Market Basket",
    price: 36,
    serves: "2–4 people",
    blurb: "Our most popular box. A full week of cooking for a small household.",
  },
  {
    key: "large",
    label: "The Farm Crate",
    price: 52,
    serves: "4–6 people",
    blurb: "Everything we've got, in volume. For big families and canners.",
  },
];

export function sizeLabel(size: string): string {
  return BOX_SIZES.find((s) => s.key === size)?.label ?? size;
}

export function sizePrice(size: string): number {
  return BOX_SIZES.find((s) => s.key === size)?.price ?? 0;
}

export function qtyForSize(
  item: { qtySmall: number; qtyMedium: number; qtyLarge: number },
  size: string,
): number {
  if (size === "small") return item.qtySmall;
  if (size === "large") return item.qtyLarge;
  return item.qtyMedium;
}

export async function getAllWeeks(): Promise<Week[]> {
  await ensureSeed();
  return db.select().from(weeks).orderBy(asc(weeks.startDate));
}

export async function getCurrentWeek(): Promise<Week> {
  await ensureSeed();
  const rows = await db
    .select()
    .from(weeks)
    .where(eq(weeks.status, "current"))
    .limit(1);
  if (rows.length > 0) return rows[0];
  const fallback = await db
    .select()
    .from(weeks)
    .orderBy(desc(weeks.startDate))
    .limit(1);
  return fallback[0];
}

export async function getWeekById(id: number): Promise<Week | null> {
  const rows = await db.select().from(weeks).where(eq(weeks.id, id)).limit(1);
  return rows[0] ?? null;
}

export type BoxLine = {
  boxItemId: number;
  produceItemId: number;
  name: string;
  unit: string;
  emoji: string;
  qtySmall: number;
  qtyMedium: number;
  qtyLarge: number;
  farmId: number;
  farmName: string;
  farmSlug: string;
  farmEmoji: string;
  farmTown: string;
};

export async function getBoxContents(weekId: number): Promise<BoxLine[]> {
  return db
    .select({
      boxItemId: boxItems.id,
      produceItemId: produceItems.id,
      name: produceItems.name,
      unit: produceItems.unit,
      emoji: produceItems.emoji,
      qtySmall: boxItems.qtySmall,
      qtyMedium: boxItems.qtyMedium,
      qtyLarge: boxItems.qtyLarge,
      farmId: farms.id,
      farmName: farms.name,
      farmSlug: farms.slug,
      farmEmoji: farms.emoji,
      farmTown: farms.town,
    })
    .from(boxItems)
    .innerJoin(produceItems, eq(boxItems.produceItemId, produceItems.id))
    .innerJoin(farms, eq(produceItems.farmId, farms.id))
    .where(eq(boxItems.weekId, weekId))
    .orderBy(asc(farms.name), asc(produceItems.name));
}

/** Make sure every active subscriber has a delivery row for this week. */
export async function ensureDeliveries(weekId: number): Promise<void> {
  const week = await getWeekById(weekId);
  if (!week || week.status === "past") return;
  const active = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.status, "active"));
  if (active.length === 0) return;
  await db
    .insert(deliveries)
    .values(
      active.map((sub) => ({
        weekId,
        subscriberId: sub.id,
        boxSize: sub.boxSize,
        status: "scheduled",
        addressSnapshot: `${sub.street}, ${sub.city} ${sub.zip}`,
      })),
    )
    .onConflictDoNothing();
}

export type SizeCounts = { small: number; medium: number; large: number; total: number };

export async function getWeekBoxCounts(weekId: number): Promise<SizeCounts> {
  const rows = await db
    .select({ size: deliveries.boxSize, count: sql<number>`count(*)::int` })
    .from(deliveries)
    .where(and(eq(deliveries.weekId, weekId), inArray(deliveries.status, ["scheduled", "delivered"])))
    .groupBy(deliveries.boxSize);
  const counts: SizeCounts = { small: 0, medium: 0, large: 0, total: 0 };
  for (const row of rows) {
    if (row.size === "small") counts.small = row.count;
    if (row.size === "medium") counts.medium = row.count;
    if (row.size === "large") counts.large = row.count;
  }
  counts.total = counts.small + counts.medium + counts.large;
  return counts;
}

export type FarmSupplyItem = {
  produceItemId: number;
  name: string;
  unit: string;
  emoji: string;
  totalQty: number;
  inventoryQty: number;
};

export type FarmSupply = {
  farmId: number;
  farmName: string;
  farmSlug: string;
  farmEmoji: string;
  farmTown: string;
  milesAway: number;
  items: FarmSupplyItem[];
  ready: boolean;
  readyNote: string;
};

export async function getFarmSupply(weekId: number): Promise<FarmSupply[]> {
  const [lines, counts, statuses] = await Promise.all([
    getBoxContents(weekId),
    getWeekBoxCounts(weekId),
    db.select().from(farmWeekStatus).where(eq(farmWeekStatus.weekId, weekId)),
  ]);
  const statusMap = new Map(statuses.map((s) => [s.farmId, s]));
  const byFarm = new Map<number, FarmSupply>();
  for (const line of lines) {
    let entry = byFarm.get(line.farmId);
    if (!entry) {
      const status = statusMap.get(line.farmId);
      entry = {
        farmId: line.farmId,
        farmName: line.farmName,
        farmSlug: line.farmSlug,
        farmEmoji: line.farmEmoji,
        farmTown: line.farmTown,
        milesAway: 0,
        items: [],
        ready: status?.ready ?? false,
        readyNote: status?.readyNote ?? "",
      };
      byFarm.set(line.farmId, entry);
    }
    const totalQty =
      line.qtySmall * counts.small +
      line.qtyMedium * counts.medium +
      line.qtyLarge * counts.large;
    entry.items.push({
      produceItemId: line.produceItemId,
      name: line.name,
      unit: line.unit,
      emoji: line.emoji,
      totalQty,
      inventoryQty: 0,
    });
  }
  const farmIds = [...byFarm.keys()];
  if (farmIds.length > 0) {
    const farmRows = await db
      .select()
      .from(farms)
      .where(inArray(farms.id, farmIds));
    for (const farm of farmRows) {
      const entry = byFarm.get(farm.id);
      if (entry) entry.milesAway = farm.milesAway;
    }
    const inventory = await db
      .select()
      .from(produceItems)
      .where(inArray(produceItems.farmId, farmIds));
    const invMap = new Map(inventory.map((p) => [p.id, p.inventoryQty]));
    for (const entry of byFarm.values()) {
      for (const item of entry.items) {
        item.inventoryQty = invMap.get(item.produceItemId) ?? 0;
      }
    }
  }
  return [...byFarm.values()].sort((a, b) => a.farmName.localeCompare(b.farmName));
}

export async function getFarmBySlugOrId(idOrSlug: number | string) {
  const rows =
    typeof idOrSlug === "number"
      ? await db.select().from(farms).where(eq(farms.id, idOrSlug)).limit(1)
      : await db.select().from(farms).where(eq(farms.slug, idOrSlug)).limit(1);
  return rows[0] ?? null;
}

export async function getAllFarms() {
  await ensureSeed();
  return db.select().from(farms).orderBy(asc(farms.name));
}

export async function getFarmInventory(farmId: number) {
  return db
    .select()
    .from(produceItems)
    .where(eq(produceItems.farmId, farmId))
    .orderBy(asc(produceItems.name));
}

export async function getAllProduceWithFarm() {
  return db
    .select({
      id: produceItems.id,
      name: produceItems.name,
      unit: produceItems.unit,
      emoji: produceItems.emoji,
      inventoryQty: produceItems.inventoryQty,
      farmId: farms.id,
      farmName: farms.name,
      farmEmoji: farms.emoji,
    })
    .from(produceItems)
    .innerJoin(farms, eq(produceItems.farmId, farms.id))
    .orderBy(asc(farms.name), asc(produceItems.name));
}

export async function getSubscriberById(id: number) {
  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubscriberByEmail(email: string) {
  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, email.trim().toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubscriberDeliveries(subscriberId: number) {
  return db
    .select({
      id: deliveries.id,
      status: deliveries.status,
      boxSize: deliveries.boxSize,
      addressSnapshot: deliveries.addressSnapshot,
      deliveredAt: deliveries.deliveredAt,
      weekId: weeks.id,
      weekLabel: weeks.label,
      weekStart: weeks.startDate,
      weekStatus: weeks.status,
      weekNote: weeks.note,
    })
    .from(deliveries)
    .innerJoin(weeks, eq(deliveries.weekId, weeks.id))
    .where(eq(deliveries.subscriberId, subscriberId))
    .orderBy(asc(weeks.startDate));
}

export type RouteStop = {
  deliveryId: number;
  name: string;
  street: string;
  city: string;
  zip: string;
  phone: string;
  boxSize: string;
  notes: string;
  status: string;
};

export async function getRouteList(weekId: number) {
  const rows = await db
    .select({
      deliveryId: deliveries.id,
      status: deliveries.status,
      boxSize: deliveries.boxSize,
      name: subscribers.name,
      street: subscribers.street,
      city: subscribers.city,
      zip: subscribers.zip,
      phone: subscribers.phone,
      notes: subscribers.notes,
    })
    .from(deliveries)
    .innerJoin(subscribers, eq(deliveries.subscriberId, subscribers.id))
    .where(eq(deliveries.weekId, weekId))
    .orderBy(asc(subscribers.zip), asc(subscribers.street));

  const groups = new Map<string, { zip: string; city: string; stops: RouteStop[] }>();
  for (const row of rows) {
    if (row.status === "skipped") continue;
    const group = groups.get(row.zip) ?? {
      zip: row.zip,
      city: row.city,
      stops: [],
    };
    group.stops.push(row);
    groups.set(row.zip, group);
  }
  return [...groups.values()].sort((a, b) => a.zip.localeCompare(b.zip));
}

export async function getSubscriberStats() {
  const rows = await db
    .select({ status: subscribers.status, count: sql<number>`count(*)::int` })
    .from(subscribers)
    .groupBy(subscribers.status);
  let active = 0;
  let paused = 0;
  for (const row of rows) {
    if (row.status === "active") active = row.count;
    if (row.status === "paused") paused = row.count;
  }
  return { active, paused, total: active + paused };
}

export async function getAllSubscribers() {
  return db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
}

export function formatWeekDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
