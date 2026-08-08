import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const farms = pgTable("farms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  town: text("town").notNull(),
  milesAway: integer("miles_away").notNull().default(10),
  story: text("story").notNull().default(""),
  emoji: text("emoji").notNull().default("🌾"),
  accessCode: text("access_code").notNull(),
});

export const produceItems = pgTable("produce_items", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id")
    .notNull()
    .references(() => farms.id),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("bunch"),
  emoji: text("emoji").notNull().default("🥬"),
  inventoryQty: integer("inventory_qty").notNull().default(200),
});

// A delivery week
export const weeks = pgTable("weeks", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  startDate: date("start_date").notNull(),
  // 'past' | 'current' | 'upcoming'
  status: text("status").notNull().default("upcoming"),
  note: text("note").notNull().default(""),
});

// What is in the box for a given week (per size quantities)
export const boxItems = pgTable("box_items", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id")
    .notNull()
    .references(() => weeks.id),
  produceItemId: integer("produce_item_id")
    .notNull()
    .references(() => produceItems.id),
  qtySmall: integer("qty_small").notNull().default(1),
  qtyMedium: integer("qty_medium").notNull().default(2),
  qtyLarge: integer("qty_large").notNull().default(3),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  boxSize: text("box_size").notNull().default("medium"),
  street: text("street").notNull(),
  city: text("city").notNull(),
  zip: text("zip").notNull(),
  notes: text("notes").notNull().default(""),
  // 'active' | 'paused'
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const deliveries = pgTable(
  "deliveries",
  {
    id: serial("id").primaryKey(),
    weekId: integer("week_id")
      .notNull()
      .references(() => weeks.id),
    subscriberId: integer("subscriber_id")
      .notNull()
      .references(() => subscribers.id),
    boxSize: text("box_size").notNull().default("medium"),
    // 'scheduled' | 'skipped' | 'delivered'
    status: text("status").notNull().default("scheduled"),
    addressSnapshot: text("address_snapshot").notNull().default(""),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("deliveries_week_subscriber_idx").on(
      table.weekId,
      table.subscriberId,
    ),
  ],
);

export const farmWeekStatus = pgTable(
  "farm_week_status",
  {
    id: serial("id").primaryKey(),
    weekId: integer("week_id")
      .notNull()
      .references(() => weeks.id),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    ready: boolean("ready").notNull().default(false),
    readyNote: text("ready_note").notNull().default(""),
    markedAt: timestamp("marked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("farm_week_status_idx").on(table.weekId, table.farmId),
  ],
);

export type Farm = typeof farms.$inferSelect;
export type ProduceItem = typeof produceItems.$inferSelect;
export type Week = typeof weeks.$inferSelect;
export type BoxItem = typeof boxItems.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
export type FarmWeekStatus = typeof farmWeekStatus.$inferSelect;
