import { db } from "@/db";
import {
  boxItems,
  deliveries,
  farms,
  produceItems,
  subscribers,
  weeks,
} from "@/db/schema";
import { sql } from "drizzle-orm";

function mondayOffset(weeksFromNow: number): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - diffToMonday + weeksFromNow * 7);
  return monday.toISOString().slice(0, 10);
}

function labelFor(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const FARM_SEED = [
  {
    name: "Willowbrook Farm",
    slug: "willowbrook",
    town: "Cedar Hollow",
    milesAway: 8,
    emoji: "🌻",
    accessCode: "willow",
    story:
      "Third-generation vegetable growers working 40 acres of river-bottom soil. Certified organic since 1998.",
  },
  {
    name: "Stonefield Orchard",
    slug: "stonefield",
    town: "Marrow Ridge",
    milesAway: 14,
    emoji: "🍎",
    accessCode: "stone",
    story:
      "Heirloom apples, pears and stone fruit on a hillside orchard planted by hand in the 1970s.",
  },
  {
    name: "Little Creek Greens",
    slug: "littlecreek",
    town: "Dunmore",
    milesAway: 5,
    emoji: "🥬",
    accessCode: "creek",
    story:
      "A two-acre market garden run by the Okonjo family. Salad greens cut the morning they're packed.",
  },
];

const PRODUCE_SEED: Record<
  string,
  { name: string; unit: string; emoji: string; inventoryQty: number }[]
> = {
  willowbrook: [
    { name: "Rainbow Carrots", unit: "bunch", emoji: "🥕", inventoryQty: 320 },
    { name: "New Potatoes", unit: "lb", emoji: "🥔", inventoryQty: 500 },
    { name: "Sweet Corn", unit: "ear", emoji: "🌽", inventoryQty: 900 },
    { name: "Heirloom Tomatoes", unit: "lb", emoji: "🍅", inventoryQty: 260 },
    { name: "Yellow Onions", unit: "each", emoji: "🧅", inventoryQty: 400 },
  ],
  stonefield: [
    { name: "Honeycrisp Apples", unit: "lb", emoji: "🍎", inventoryQty: 600 },
    { name: "Bartlett Pears", unit: "each", emoji: "🍐", inventoryQty: 350 },
    { name: "Italian Plums", unit: "pint", emoji: "🫐", inventoryQty: 180 },
    { name: "Raw Wildflower Honey", unit: "jar", emoji: "🍯", inventoryQty: 90 },
  ],
  littlecreek: [
    { name: "Butter Lettuce", unit: "head", emoji: "🥬", inventoryQty: 300 },
    { name: "Rainbow Chard", unit: "bunch", emoji: "🌿", inventoryQty: 240 },
    { name: "Cherry Tomatoes", unit: "pint", emoji: "🍒", inventoryQty: 220 },
    { name: "Basil", unit: "bunch", emoji: "🌱", inventoryQty: 200 },
    { name: "Shiitake Mushrooms", unit: "8oz", emoji: "🍄", inventoryQty: 120 },
  ],
};

const SUBSCRIBER_SEED = [
  {
    name: "Dana Whitfield",
    email: "dana@example.com",
    boxSize: "medium",
    street: "412 Mill Pond Rd",
    city: "Dunmore",
    zip: "04021",
    phone: "555-0142",
    notes: "Leave on the side porch, gate is unlatched.",
  },
  {
    name: "Marcus Ruiz",
    email: "marcus@example.com",
    boxSize: "large",
    street: "77 Alder St, Apt 3",
    city: "Dunmore",
    zip: "04021",
    phone: "555-0177",
    notes: "",
  },
  {
    name: "Priya Nadkarni",
    email: "priya@example.com",
    boxSize: "small",
    street: "18 Quarry Lane",
    city: "Cedar Hollow",
    zip: "04033",
    phone: "555-0198",
    notes: "No cilantro please.",
  },
  {
    name: "The Halloran Family",
    email: "halloran@example.com",
    boxSize: "large",
    street: "2201 Ridge Crest Dr",
    city: "Cedar Hollow",
    zip: "04033",
    phone: "555-0110",
    notes: "",
  },
  {
    name: "Ellis Fontaine",
    email: "ellis@example.com",
    boxSize: "medium",
    street: "9 Weaver Ct",
    city: "Marrow Ridge",
    zip: "04047",
    phone: "555-0163",
    notes: "Buzz 4B.",
  },
  {
    name: "Joan Baptiste",
    email: "joan@example.com",
    boxSize: "small",
    street: "530 Chapel Hill Rd",
    city: "Marrow Ridge",
    zip: "04047",
    phone: "555-0121",
    notes: "",
  },
  {
    name: "Tomas Berg",
    email: "tomas@example.com",
    boxSize: "medium",
    street: "1140 Birch Row",
    city: "Dunmore",
    zip: "04021",
    phone: "555-0155",
    notes: "",
  },
];

let seedPromise: Promise<void> | null = null;

export function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const existing = await db.select({ id: farms.id }).from(farms).limit(1);
  if (existing.length > 0) return;

  const insertedFarms = await db.insert(farms).values(FARM_SEED).returning();

  const produceRows: {
    farmId: number;
    name: string;
    unit: string;
    emoji: string;
    inventoryQty: number;
  }[] = [];
  for (const farm of insertedFarms) {
    for (const item of PRODUCE_SEED[farm.slug] ?? []) {
      produceRows.push({ farmId: farm.id, ...item });
    }
  }
  const insertedProduce = await db
    .insert(produceItems)
    .values(produceRows)
    .returning();

  const byName = new Map(insertedProduce.map((p) => [p.name, p.id]));

  const weekDefs = [
    { offset: -2, status: "past", note: "Late summer abundance." },
    { offset: -1, status: "past", note: "First of the apples." },
    { offset: 0, status: "current", note: "Peak tomato week — eat them fast." },
    { offset: 1, status: "upcoming", note: "" },
    { offset: 2, status: "upcoming", note: "" },
  ];

  const insertedWeeks = await db
    .insert(weeks)
    .values(
      weekDefs.map((w) => {
        const startDate = mondayOffset(w.offset);
        return {
          label: `Week of ${labelFor(startDate)}`,
          startDate,
          status: w.status,
          note: w.note,
        };
      }),
    )
    .returning();

  const contents: Record<number, [string, number, number, number][]> = {
    0: [
      ["Sweet Corn", 4, 6, 8],
      ["Heirloom Tomatoes", 1, 2, 3],
      ["Butter Lettuce", 1, 1, 2],
      ["New Potatoes", 1, 2, 3],
      ["Basil", 1, 1, 2],
    ],
    1: [
      ["Honeycrisp Apples", 1, 2, 3],
      ["Rainbow Chard", 1, 2, 2],
      ["Yellow Onions", 2, 3, 5],
      ["Cherry Tomatoes", 1, 1, 2],
      ["Italian Plums", 1, 1, 2],
    ],
    2: [
      ["Heirloom Tomatoes", 1, 2, 3],
      ["Rainbow Carrots", 1, 2, 3],
      ["Butter Lettuce", 1, 1, 2],
      ["Honeycrisp Apples", 1, 2, 3],
      ["Shiitake Mushrooms", 1, 1, 2],
      ["Raw Wildflower Honey", 0, 1, 1],
    ],
  };

  const boxRows: {
    weekId: number;
    produceItemId: number;
    qtySmall: number;
    qtyMedium: number;
    qtyLarge: number;
  }[] = [];
  for (const [index, rows] of Object.entries(contents)) {
    const week = insertedWeeks[Number(index)];
    for (const [name, s, m, l] of rows) {
      const produceItemId = byName.get(name);
      if (!produceItemId) continue;
      boxRows.push({
        weekId: week.id,
        produceItemId,
        qtySmall: s,
        qtyMedium: m,
        qtyLarge: l,
      });
    }
  }
  await db.insert(boxItems).values(boxRows);

  const insertedSubs = await db
    .insert(subscribers)
    .values(SUBSCRIBER_SEED)
    .returning();

  const deliveryRows: {
    weekId: number;
    subscriberId: number;
    boxSize: string;
    status: string;
    addressSnapshot: string;
    deliveredAt: Date | null;
  }[] = [];
  for (const sub of insertedSubs) {
    const address = `${sub.street}, ${sub.city} ${sub.zip}`;
    insertedWeeks.forEach((week, index) => {
      const skipped = sub.email === "priya@example.com" && index === 1;
      deliveryRows.push({
        weekId: week.id,
        subscriberId: sub.id,
        boxSize: sub.boxSize,
        status:
          week.status === "past"
            ? skipped
              ? "skipped"
              : "delivered"
            : "scheduled",
        addressSnapshot: address,
        deliveredAt:
          week.status === "past" && !skipped
            ? new Date(week.startDate + "T17:00:00Z")
            : null,
      });
    });
  }
  await db.insert(deliveries).values(deliveryRows).onConflictDoNothing();
}

export async function tablesReady(): Promise<boolean> {
  try {
    await db.execute(sql`select 1 from farms limit 1`);
    return true;
  } catch {
    return false;
  }
}
