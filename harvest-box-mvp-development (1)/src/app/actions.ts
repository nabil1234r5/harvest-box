"use server";

import { db } from "@/db";
import {
  boxItems,
  deliveries,
  farmWeekStatus,
  subscribers,
  weeks,
} from "@/db/schema";
import {
  ensureDeliveries,
  getCurrentWeek,
  getFarmBySlugOrId,
  getSubscriberByEmail,
} from "@/lib/data";
import { ensureSeed } from "@/lib/seed";
import {
  CUSTOMER_COOKIE,
  FARM_COOKIE,
  OPS_COOKIE,
  OPS_PASSCODE,
  clearCookieValue,
  getCustomerId,
  getFarmId,
  isOps,
  setCookieValue,
} from "@/lib/session";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function subscribeAction(formData: FormData) {
  await ensureSeed();
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const boxSize = str(formData, "boxSize") || "medium";
  const street = str(formData, "street");
  const city = str(formData, "city");
  const zip = str(formData, "zip");
  const phone = str(formData, "phone");
  const notes = str(formData, "notes");

  if (!name || !email || !street || !city || !zip) {
    redirect("/join?error=missing");
  }

  const existing = await getSubscriberByEmail(email);
  if (existing) {
    await setCookieValue(CUSTOMER_COOKIE, String(existing.id));
    redirect("/dashboard?welcome=back");
  }

  const [created] = await db
    .insert(subscribers)
    .values({ name, email, boxSize, street, city, zip, phone, notes })
    .returning();

  const futureWeeks = await db
    .select()
    .from(weeks)
    .where(inArray(weeks.status, ["current", "upcoming"]));
  if (futureWeeks.length > 0) {
    await db
      .insert(deliveries)
      .values(
        futureWeeks.map((week) => ({
          weekId: week.id,
          subscriberId: created.id,
          boxSize,
          status: "scheduled",
          addressSnapshot: `${street}, ${city} ${zip}`,
        })),
      )
      .onConflictDoNothing();
  }

  await setCookieValue(CUSTOMER_COOKIE, String(created.id));
  redirect("/dashboard?welcome=new");
}

export async function customerLoginAction(formData: FormData) {
  await ensureSeed();
  const email = str(formData, "email").toLowerCase();
  const sub = await getSubscriberByEmail(email);
  if (!sub) redirect("/login?error=notfound");
  await setCookieValue(CUSTOMER_COOKIE, String(sub.id));
  redirect("/dashboard");
}

export async function logoutAction(formData: FormData) {
  const kind = str(formData, "kind");
  if (kind === "farm") {
    await clearCookieValue(FARM_COOKIE);
    redirect("/farm");
  }
  if (kind === "ops") {
    await clearCookieValue(OPS_COOKIE);
    redirect("/ops");
  }
  await clearCookieValue(CUSTOMER_COOKIE);
  redirect("/");
}

export async function toggleSkipAction(formData: FormData) {
  const customerId = await getCustomerId();
  if (!customerId) redirect("/login");
  const deliveryId = Number(str(formData, "deliveryId"));
  const rows = await db
    .select()
    .from(deliveries)
    .where(
      and(eq(deliveries.id, deliveryId), eq(deliveries.subscriberId, customerId)),
    )
    .limit(1);
  const delivery = rows[0];
  if (!delivery || delivery.status === "delivered") redirect("/dashboard");
  await db
    .update(deliveries)
    .set({ status: delivery.status === "skipped" ? "scheduled" : "skipped" })
    .where(eq(deliveries.id, deliveryId));
  revalidatePath("/dashboard");
}

export async function setPauseAction(formData: FormData) {
  const customerId = await getCustomerId();
  if (!customerId) redirect("/login");
  const status = str(formData, "status") === "paused" ? "paused" : "active";
  await db
    .update(subscribers)
    .set({ status })
    .where(eq(subscribers.id, customerId));

  if (status === "paused") {
    const futureWeeks = await db
      .select()
      .from(weeks)
      .where(inArray(weeks.status, ["current", "upcoming"]));
    if (futureWeeks.length > 0) {
      await db
        .update(deliveries)
        .set({ status: "skipped" })
        .where(
          and(
            eq(deliveries.subscriberId, customerId),
            inArray(
              deliveries.weekId,
              futureWeeks.map((w) => w.id),
            ),
            eq(deliveries.status, "scheduled"),
          ),
        );
    }
  } else {
    const futureWeeks = await db
      .select()
      .from(weeks)
      .where(inArray(weeks.status, ["current", "upcoming"]));
    if (futureWeeks.length > 0) {
      await db
        .update(deliveries)
        .set({ status: "scheduled" })
        .where(
          and(
            eq(deliveries.subscriberId, customerId),
            inArray(
              deliveries.weekId,
              futureWeeks.map((w) => w.id),
            ),
            eq(deliveries.status, "skipped"),
          ),
        );
    }
  }
  revalidatePath("/dashboard");
}

export async function updateProfileAction(formData: FormData) {
  const customerId = await getCustomerId();
  if (!customerId) redirect("/login");
  const street = str(formData, "street");
  const city = str(formData, "city");
  const zip = str(formData, "zip");
  const phone = str(formData, "phone");
  const notes = str(formData, "notes");
  const boxSize = str(formData, "boxSize") || "medium";
  if (!street || !city || !zip) redirect("/dashboard?error=address");

  await db
    .update(subscribers)
    .set({ street, city, zip, phone, notes, boxSize })
    .where(eq(subscribers.id, customerId));

  const futureWeeks = await db
    .select()
    .from(weeks)
    .where(inArray(weeks.status, ["current", "upcoming"]));
  if (futureWeeks.length > 0) {
    await db
      .update(deliveries)
      .set({ boxSize, addressSnapshot: `${street}, ${city} ${zip}` })
      .where(
        and(
          eq(deliveries.subscriberId, customerId),
          inArray(
            deliveries.weekId,
            futureWeeks.map((w) => w.id),
          ),
        ),
      );
  }
  revalidatePath("/dashboard");
  redirect("/dashboard?saved=1");
}

export async function farmLoginAction(formData: FormData) {
  await ensureSeed();
  const slug = str(formData, "slug");
  const code = str(formData, "code").toLowerCase();
  const farm = await getFarmBySlugOrId(slug);
  if (!farm || farm.accessCode.toLowerCase() !== code) {
    redirect("/farm?error=1");
  }
  await setCookieValue(FARM_COOKIE, String(farm.id));
  redirect("/farm/dashboard");
}

export async function farmReadyAction(formData: FormData) {
  const farmId = await getFarmId();
  if (!farmId) redirect("/farm");
  const weekId = Number(str(formData, "weekId"));
  const ready = str(formData, "ready") === "yes";
  const readyNote = str(formData, "readyNote");
  await db
    .insert(farmWeekStatus)
    .values({
      weekId,
      farmId,
      ready,
      readyNote,
      markedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [farmWeekStatus.weekId, farmWeekStatus.farmId],
      set: { ready, readyNote, markedAt: new Date() },
    });
  revalidatePath("/farm/dashboard");
  revalidatePath("/ops/dashboard");
}

export async function opsLoginAction(formData: FormData) {
  await ensureSeed();
  const passcode = str(formData, "passcode");
  if (passcode !== OPS_PASSCODE) redirect("/ops?error=1");
  await setCookieValue(OPS_COOKIE, "yes");
  redirect("/ops/dashboard");
}

export async function saveBoxAction(formData: FormData) {
  if (!(await isOps())) redirect("/ops");
  const weekId = Number(str(formData, "weekId"));
  const note = str(formData, "note");
  const selected = formData.getAll("include").map((v) => Number(v));

  await db.delete(boxItems).where(eq(boxItems.weekId, weekId));

  const rows = selected
    .map((produceItemId) => ({
      weekId,
      produceItemId,
      qtySmall: Math.max(0, Number(str(formData, `s_${produceItemId}`)) || 0),
      qtyMedium: Math.max(0, Number(str(formData, `m_${produceItemId}`)) || 0),
      qtyLarge: Math.max(0, Number(str(formData, `l_${produceItemId}`)) || 0),
    }))
    .filter((row) => Number.isFinite(row.produceItemId));

  if (rows.length > 0) {
    await db.insert(boxItems).values(rows);
  }
  await db.update(weeks).set({ note }).where(eq(weeks.id, weekId));

  revalidatePath("/ops/box");
  revalidatePath("/ops/dashboard");
  revalidatePath("/");
  redirect(`/ops/box?week=${weekId}&saved=1`);
}

export async function advanceWeekAction() {
  if (!(await isOps())) redirect("/ops");
  const current = await getCurrentWeek();
  if (!current) redirect("/ops/dashboard");

  await db
    .update(deliveries)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(
      and(eq(deliveries.weekId, current.id), eq(deliveries.status, "scheduled")),
    );
  await db.update(weeks).set({ status: "past" }).where(eq(weeks.id, current.id));

  const nextRows = await db
    .select()
    .from(weeks)
    .where(gt(weeks.startDate, current.startDate))
    .orderBy(asc(weeks.startDate))
    .limit(1);

  let nextWeekId: number;
  if (nextRows.length > 0) {
    nextWeekId = nextRows[0].id;
    await db
      .update(weeks)
      .set({ status: "current" })
      .where(eq(weeks.id, nextWeekId));
  } else {
    const start = new Date(current.startDate + "T00:00:00Z");
    start.setUTCDate(start.getUTCDate() + 7);
    const iso = start.toISOString().slice(0, 10);
    const [created] = await db
      .insert(weeks)
      .values({
        label: `Week of ${new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}`,
        startDate: iso,
        status: "current",
      })
      .returning();
    nextWeekId = created.id;
  }

  // Always keep one future week on the books.
  const futures = await db
    .select()
    .from(weeks)
    .where(eq(weeks.status, "upcoming"));
  if (futures.length === 0) {
    const latest = await db
      .select()
      .from(weeks)
      .orderBy(asc(weeks.startDate));
    const last = latest[latest.length - 1];
    const start = new Date(last.startDate + "T00:00:00Z");
    start.setUTCDate(start.getUTCDate() + 7);
    const iso = start.toISOString().slice(0, 10);
    await db.insert(weeks).values({
      label: `Week of ${new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}`,
      startDate: iso,
      status: "upcoming",
    });
  }

  await ensureDeliveries(nextWeekId);
  revalidatePath("/ops/dashboard");
  revalidatePath("/dashboard");
  revalidatePath("/farm/dashboard");
  revalidatePath("/");
  redirect("/ops/dashboard?advanced=1");
}
