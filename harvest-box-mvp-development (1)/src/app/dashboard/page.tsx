import Link from "next/link";
import { redirect } from "next/navigation";
import {
  logoutAction,
  setPauseAction,
  toggleSkipAction,
  updateProfileAction,
} from "@/app/actions";
import {
  BOX_SIZES,
  ensureDeliveries,
  formatWeekDate,
  getBoxContents,
  getSubscriberById,
  getSubscriberDeliveries,
  qtyForSize,
  sizeLabel,
  sizePrice,
  type BoxLine,
} from "@/lib/data";
import { getCustomerId } from "@/lib/session";
import { ensureSeed } from "@/lib/seed";
import { db } from "@/db";
import { weeks } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function CustomerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  await ensureSeed();
  const customerId = await getCustomerId();
  if (!customerId) redirect("/login");
  const subscriber = await getSubscriberById(customerId);
  if (!subscriber) redirect("/login");

  const futureWeeks = await db
    .select()
    .from(weeks)
    .where(inArray(weeks.status, ["current", "upcoming"]));
  if (subscriber.status === "active") {
    for (const week of futureWeeks) {
      await ensureDeliveries(week.id);
    }
  }

  const allDeliveries = await getSubscriberDeliveries(customerId);
  const upcoming = allDeliveries.filter((d) => d.weekStatus !== "past");
  const past = allDeliveries
    .filter((d) => d.weekStatus === "past")
    .reverse();

  const nextBox = upcoming[0];
  const contentsByWeek = new Map<number, BoxLine[]>();
  for (const delivery of upcoming.slice(0, 2)) {
    contentsByWeek.set(delivery.weekId, await getBoxContents(delivery.weekId));
  }

  const paused = subscriber.status === "paused";
  const deliveredCount = past.filter((d) => d.status === "delivered").length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
            Your subscription
          </p>
          <h1 className="font-display text-4xl text-bark">
            Hello, {subscriber.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-bark-soft">
            {sizeLabel(subscriber.boxSize)} · ${sizePrice(subscriber.boxSize)}/wk
            · {subscriber.street}, {subscriber.city} {subscriber.zip}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              paused
                ? "bg-wheat/25 text-bark"
                : "bg-moss/15 text-moss-dark"
            }`}
          >
            {paused ? "Paused" : "Active"}
          </span>
          <form action={setPauseAction}>
            <input
              type="hidden"
              name="status"
              value={paused ? "active" : "paused"}
            />
            <button className="rounded-full border border-linen bg-cream px-4 py-1.5 text-sm font-semibold text-bark transition hover:bg-parchment">
              {paused ? "Resume deliveries" : "Pause subscription"}
            </button>
          </form>
          <form action={logoutAction}>
            <input type="hidden" name="kind" value="customer" />
            <button className="rounded-full px-3 py-1.5 text-sm text-bark-soft underline">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {params.welcome ? (
        <p className="mt-6 rounded-xl border border-moss/30 bg-moss/10 px-4 py-3 text-sm text-moss-dark">
          {params.welcome === "new"
            ? "You're in! Your first box is scheduled — the farms have been told."
            : "Welcome back — we found your existing subscription."}
        </p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-xl border border-moss/30 bg-moss/10 px-4 py-3 text-sm text-moss-dark">
          Saved. Your upcoming boxes were updated.
        </p>
      ) : null}
      {params.error === "address" ? (
        <p className="mt-6 rounded-xl border border-brick/30 bg-brick/10 px-4 py-3 text-sm text-brick">
          Street, town and zip are all required.
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-8">
          {/* Next box */}
          <section className="paper rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-bark">
                  {nextBox ? nextBox.weekLabel : "No upcoming box"}
                </h2>
                <p className="text-sm text-bark-soft">
                  {nextBox
                    ? `Delivered Friday · week of ${formatWeekDate(nextBox.weekStart)}`
                    : "Resume your subscription to schedule the next one."}
                </p>
              </div>
              {nextBox ? (
                <form action={toggleSkipAction}>
                  <input
                    type="hidden"
                    name="deliveryId"
                    value={nextBox.id}
                  />
                  <button
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      nextBox.status === "skipped"
                        ? "bg-moss text-cream hover:bg-moss-dark"
                        : "border border-linen bg-cream text-bark hover:bg-parchment"
                    }`}
                  >
                    {nextBox.status === "skipped"
                      ? "Un-skip this week"
                      : "Skip this week"}
                  </button>
                </form>
              ) : null}
            </div>

            {nextBox ? (
              nextBox.status === "skipped" ? (
                <p className="tape-label mt-5 rounded-xl px-4 py-6 text-center font-display text-lg text-bark-soft">
                  You&apos;re skipping this week. No box, no charge.
                </p>
              ) : (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {(contentsByWeek.get(nextBox.weekId) ?? []).map((line) => (
                    <li
                      key={line.boxItemId}
                      className="flex items-center gap-3 rounded-xl border border-linen bg-cream/50 px-3 py-2"
                    >
                      <span className="text-xl">{line.emoji}</span>
                      <span className="text-sm">
                        <span className="font-semibold text-bark">
                          {qtyForSize(line, subscriber.boxSize)} {line.unit}
                        </span>{" "}
                        <span className="text-bark">{line.name}</span>
                        <span className="block text-xs text-bark-soft">
                          {line.farmName}
                        </span>
                      </span>
                    </li>
                  ))}
                  {(contentsByWeek.get(nextBox.weekId) ?? []).length === 0 ? (
                    <li className="text-sm text-bark-soft">
                      Contents not published yet — check back Tuesday.
                    </li>
                  ) : null}
                </ul>
              )
            ) : null}
          </section>

          {/* Later weeks */}
          {upcoming.length > 1 ? (
            <section className="paper rounded-2xl p-6">
              <h2 className="font-display text-2xl text-bark">
                Coming up after that
              </h2>
              <ul className="mt-4 divide-y divide-linen">
                {upcoming.slice(1).map((delivery) => (
                  <li
                    key={delivery.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-semibold text-bark">
                        {delivery.weekLabel}
                      </p>
                      <p className="text-sm text-bark-soft">
                        {sizeLabel(delivery.boxSize)} ·{" "}
                        {delivery.status === "skipped"
                          ? "Skipping"
                          : "Scheduled"}
                      </p>
                    </div>
                    <form action={toggleSkipAction}>
                      <input
                        type="hidden"
                        name="deliveryId"
                        value={delivery.id}
                      />
                      <button className="rounded-full border border-linen px-4 py-1.5 text-sm font-semibold text-bark transition hover:bg-parchment">
                        {delivery.status === "skipped" ? "Un-skip" : "Skip"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Past deliveries */}
          <section className="paper rounded-2xl p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl text-bark">
                Past deliveries
              </h2>
              <p className="text-sm text-bark-soft">
                {deliveredCount} box{deliveredCount === 1 ? "" : "es"} received
              </p>
            </div>
            {past.length === 0 ? (
              <p className="mt-4 text-sm text-bark-soft">
                Nothing yet — your history starts with the next delivery.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-linen">
                {past.map((delivery) => (
                  <li
                    key={delivery.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div>
                      <p className="font-semibold text-bark">
                        {delivery.weekLabel}
                      </p>
                      <p className="text-sm text-bark-soft">
                        {delivery.addressSnapshot}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                        delivery.status === "delivered"
                          ? "bg-moss/15 text-moss-dark"
                          : "bg-linen text-bark-soft"
                      }`}
                    >
                      {delivery.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Settings */}
        <aside className="paper rounded-2xl p-6">
          <h2 className="font-display text-2xl text-bark">
            Delivery details
          </h2>
          <p className="mt-1 text-sm text-bark-soft">
            Changes apply to every box that hasn&apos;t left the barn yet.
          </p>
          <form action={updateProfileAction} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="boxSize">
                Box size
              </label>
              <select
                id="boxSize"
                name="boxSize"
                defaultValue={subscriber.boxSize}
                className="field"
              >
                {BOX_SIZES.map((size) => (
                  <option key={size.key} value={size.key}>
                    {size.label} — ${size.price}/wk ({size.serves})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="street">
                Street
              </label>
              <input
                id="street"
                name="street"
                className="field"
                defaultValue={subscriber.street}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label" htmlFor="city">
                  Town
                </label>
                <input
                  id="city"
                  name="city"
                  className="field"
                  defaultValue={subscriber.city}
                />
              </div>
              <div>
                <label className="label" htmlFor="zip">
                  Zip
                </label>
                <input
                  id="zip"
                  name="zip"
                  className="field"
                  defaultValue={subscriber.zip}
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                className="field"
                defaultValue={subscriber.phone}
              />
            </div>
            <div>
              <label className="label" htmlFor="notes">
                Drop-off notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="field"
                defaultValue={subscriber.notes}
              />
            </div>
            <button className="w-full rounded-full bg-clay px-6 py-3 font-semibold text-cream transition hover:bg-clay-dark">
              Save changes
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-bark-soft">
            Questions?{" "}
            <Link href="/" className="underline">
              Read how it works
            </Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
