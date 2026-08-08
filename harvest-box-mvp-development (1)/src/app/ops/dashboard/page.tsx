import Link from "next/link";
import { redirect } from "next/navigation";
import { advanceWeekAction, logoutAction } from "@/app/actions";
import {
  BOX_SIZES,
  ensureDeliveries,
  formatWeekDate,
  getAllSubscribers,
  getAllWeeks,
  getBoxContents,
  getCurrentWeek,
  getFarmSupply,
  getRouteList,
  getSubscriberStats,
  getWeekBoxCounts,
  sizeLabel,
  sizePrice,
} from "@/lib/data";
import { isOps } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OpsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ advanced?: string }>;
}) {
  const params = await searchParams;
  if (!(await isOps())) redirect("/ops");

  const week = await getCurrentWeek();
  await ensureDeliveries(week.id);

  const [contents, counts, supply, routes, stats, subscribers, allWeeks] =
    await Promise.all([
      getBoxContents(week.id),
      getWeekBoxCounts(week.id),
      getFarmSupply(week.id),
      getRouteList(week.id),
      getSubscriberStats(),
      getAllSubscribers(),
      getAllWeeks(),
    ]);

  const weeklyRevenue =
    counts.small * sizePrice("small") +
    counts.medium * sizePrice("medium") +
    counts.large * sizePrice("large");
  const totalStops = routes.reduce((sum, group) => sum + group.stops.length, 0);
  const farmsReady = supply.filter((farm) => farm.ready).length;
  const skipped = stats.total - counts.total;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">
            Operations · {week.label}
          </p>
          <h1 className="font-display text-4xl text-bark">
            Pack list &amp; run sheet
          </h1>
          <p className="mt-1 text-bark-soft">
            Harvest Wednesday · pack Thursday · deliver Friday, week of{" "}
            {formatWeekDate(week.startDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/ops/box?week=${week.id}`}
            className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-cream transition hover:bg-moss-dark"
          >
            Build the box
          </Link>
          <form action={advanceWeekAction}>
            <button className="rounded-full border border-linen bg-cream px-4 py-2 text-sm font-semibold text-bark transition hover:bg-parchment">
              Close out week →
            </button>
          </form>
          <form action={logoutAction}>
            <input type="hidden" name="kind" value="ops" />
            <button className="rounded-full px-3 py-2 text-sm text-bark-soft underline">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {params.advanced ? (
        <p className="mt-6 rounded-xl border border-moss/30 bg-moss/10 px-4 py-3 text-sm text-moss-dark">
          Week closed out. All scheduled boxes marked delivered and the next
          week is now live.
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Subscribers", `${stats.active}`, `${stats.paused} paused`],
          [
            "Boxes this week",
            `${counts.total}`,
            `${skipped} skipping`,
          ],
          [
            "Size split",
            `${counts.small}/${counts.medium}/${counts.large}`,
            "S / M / L",
          ],
          ["Week revenue", `$${weeklyRevenue}`, "uncollected (MVP)"],
          [
            "Farms ready",
            `${farmsReady}/${supply.length}`,
            "loads confirmed",
          ],
        ].map(([label, value, sub]) => (
          <div key={label} className="paper rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-bark-soft">
              {label}
            </p>
            <p className="font-display text-3xl text-bark">{value}</p>
            <p className="text-xs text-bark-soft">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        {/* Farm supply */}
        <section className="paper rounded-2xl p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-2xl text-bark">
              Farm orders for {week.label.toLowerCase()}
            </h2>
            <Link
              href={`/ops/box?week=${week.id}`}
              className="text-sm text-clay underline"
            >
              Edit contents
            </Link>
          </div>
          {supply.length === 0 ? (
            <p className="mt-4 text-bark-soft">
              No items in this week&apos;s box yet.{" "}
              <Link href={`/ops/box?week=${week.id}`} className="underline">
                Build it
              </Link>
              .
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {supply.map((farm) => (
                <div
                  key={farm.farmId}
                  className="rounded-2xl border border-linen bg-cream/50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-xl text-bark">
                        {farm.farmEmoji} {farm.farmName}
                      </h3>
                      <p className="text-xs uppercase tracking-wider text-bark-soft">
                        {farm.farmTown} · {farm.milesAway} mi
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                        farm.ready
                          ? "bg-moss/15 text-moss-dark"
                          : "bg-wheat/25 text-bark"
                      }`}
                    >
                      {farm.ready ? "Ready for pickup" : "Not confirmed"}
                    </span>
                  </div>
                  {farm.readyNote ? (
                    <p className="mt-2 rounded-lg bg-parchment px-3 py-2 text-sm text-bark-soft">
                      “{farm.readyNote}”
                    </p>
                  ) : null}
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {farm.items.map((item) => {
                      const short = item.inventoryQty < item.totalQty;
                      return (
                        <li
                          key={item.produceItemId}
                          className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm"
                        >
                          <span>
                            {item.emoji} {item.name}
                          </span>
                          <span
                            className={
                              short
                                ? "font-semibold text-brick"
                                : "font-semibold text-bark"
                            }
                          >
                            {item.totalQty} {item.unit}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Route list */}
        <section className="paper rounded-2xl p-6">
          <h2 className="font-display text-2xl text-bark">
            Friday route list
          </h2>
          <p className="text-sm text-bark-soft">
            {totalStops} stops in {routes.length} area
            {routes.length === 1 ? "" : "s"} · grouped by zip
          </p>
          <div className="mt-4 space-y-5">
            {routes.map((group, index) => (
              <div key={group.zip}>
                <div className="flex items-center justify-between rounded-lg bg-parchment px-3 py-2">
                  <p className="font-display text-lg text-bark">
                    Run {index + 1} · {group.city} {group.zip}
                  </p>
                  <span className="text-xs uppercase tracking-wider text-bark-soft">
                    {group.stops.length} stops
                  </span>
                </div>
                <ol className="mt-2 space-y-2">
                  {group.stops.map((stop, stopIndex) => (
                    <li
                      key={stop.deliveryId}
                      className="flex gap-3 border-b border-linen/70 pb-2 text-sm"
                    >
                      <span className="font-display text-lg text-clay/70">
                        {stopIndex + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-bark">
                          {stop.name} ·{" "}
                          <span className="font-normal text-bark-soft">
                            {sizeLabel(stop.boxSize)}
                          </span>
                        </p>
                        <p className="text-bark-soft">{stop.street}</p>
                        {stop.notes ? (
                          <p className="text-xs italic text-bark-soft">
                            {stop.notes}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {routes.length === 0 ? (
              <p className="text-sm text-bark-soft">
                No deliveries scheduled for this week.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* Box contents + subscribers */}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="paper rounded-2xl p-6">
          <h2 className="font-display text-2xl text-bark">
            This week&apos;s box
          </h2>
          {week.note ? (
            <p className="mt-1 text-sm italic text-bark-soft">{week.note}</p>
          ) : null}
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-linen text-xs uppercase tracking-wider text-bark-soft">
                <th className="py-2">Item</th>
                <th className="py-2">Farm</th>
                <th className="py-2 text-right">S / M / L</th>
              </tr>
            </thead>
            <tbody>
              {contents.map((line) => (
                <tr key={line.boxItemId} className="border-b border-linen/60">
                  <td className="py-2">
                    {line.emoji} {line.name}
                  </td>
                  <td className="py-2 text-bark-soft">{line.farmName}</td>
                  <td className="py-2 text-right">
                    {line.qtySmall} / {line.qtyMedium} / {line.qtyLarge}{" "}
                    <span className="text-xs text-bark-soft">{line.unit}</span>
                  </td>
                </tr>
              ))}
              {contents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-bark-soft">
                    Empty box — nothing set for this week.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-bark-soft">
            {allWeeks.map((w) => (
              <Link
                key={w.id}
                href={`/ops/box?week=${w.id}`}
                className={`rounded-full border px-3 py-1 ${
                  w.id === week.id
                    ? "border-clay bg-clay/10 text-clay"
                    : "border-linen hover:bg-parchment"
                }`}
              >
                {w.label} · {w.status}
              </Link>
            ))}
          </div>
        </section>

        <section className="paper rounded-2xl p-6">
          <h2 className="font-display text-2xl text-bark">Subscribers</h2>
          <p className="text-sm text-bark-soft">
            {stats.active} active · {stats.paused} paused
          </p>
          <div className="mt-4 max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-linen text-xs uppercase tracking-wider text-bark-soft">
                  <th className="py-2">Member</th>
                  <th className="py-2">Area</th>
                  <th className="py-2 text-right">Box</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b border-linen/60">
                    <td className="py-2">
                      <span className="font-semibold text-bark">
                        {sub.name}
                      </span>
                      <span className="block text-xs text-bark-soft">
                        {sub.email}
                      </span>
                    </td>
                    <td className="py-2 text-bark-soft">
                      {sub.city} {sub.zip}
                    </td>
                    <td className="py-2 text-right">
                      {sizeLabel(sub.boxSize)}
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          sub.status === "active"
                            ? "bg-moss/15 text-moss-dark"
                            : "bg-linen text-bark-soft"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-bark-soft">
            Pricing: {BOX_SIZES.map((s) => `${s.label} $${s.price}`).join(" · ")}
          </p>
        </section>
      </div>
    </main>
  );
}
