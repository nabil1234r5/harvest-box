import { redirect } from "next/navigation";
import { farmReadyAction, logoutAction } from "@/app/actions";
import { db } from "@/db";
import { farmWeekStatus, weeks } from "@/db/schema";
import {
  BOX_SIZES,
  ensureDeliveries,
  formatWeekDate,
  getBoxContents,
  getCurrentWeek,
  getFarmBySlugOrId,
  getFarmInventory,
  getWeekBoxCounts,
} from "@/lib/data";
import { getFarmId } from "@/lib/session";
import { and, asc, eq, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function FarmDashboard() {
  const farmId = await getFarmId();
  if (!farmId) redirect("/farm");
  const farm = await getFarmBySlugOrId(farmId);
  if (!farm) redirect("/farm");

  const week = await getCurrentWeek();
  await ensureDeliveries(week.id);

  const [contents, counts, inventory, statusRows, nextWeeks] =
    await Promise.all([
      getBoxContents(week.id),
      getWeekBoxCounts(week.id),
      getFarmInventory(farmId),
      db
        .select()
        .from(farmWeekStatus)
        .where(
          and(
            eq(farmWeekStatus.weekId, week.id),
            eq(farmWeekStatus.farmId, farmId),
          ),
        )
        .limit(1),
      db
        .select()
        .from(weeks)
        .where(gt(weeks.startDate, week.startDate))
        .orderBy(asc(weeks.startDate))
        .limit(1),
    ]);

  const myLines = contents.filter((line) => line.farmId === farmId);
  const status = statusRows[0];
  const invMap = new Map(inventory.map((item) => [item.id, item]));

  const rows = myLines.map((line) => {
    const total =
      line.qtySmall * counts.small +
      line.qtyMedium * counts.medium +
      line.qtyLarge * counts.large;
    const inv = invMap.get(line.produceItemId);
    return { line, total, inventory: inv?.inventoryQty ?? 0 };
  });

  const nextWeek = nextWeeks[0];
  const nextWeekLines = nextWeek
    ? (await getBoxContents(nextWeek.id)).filter((l) => l.farmId === farmId)
    : [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
            Grower sheet · {week.label}
          </p>
          <h1 className="font-display text-4xl text-bark">
            {farm.emoji} {farm.name}
          </h1>
          <p className="mt-1 text-bark-soft">
            {farm.town} · {farm.milesAway} miles out · pickup Thursday 7am
          </p>
        </div>
        <form action={logoutAction}>
          <input type="hidden" name="kind" value="farm" />
          <button className="rounded-full border border-linen px-4 py-1.5 text-sm text-bark-soft transition hover:bg-parchment">
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ["Boxes this week", counts.total],
          ["Small", counts.small],
          ["Medium", counts.medium],
          ["Large", counts.large],
        ].map(([label, value]) => (
          <div key={String(label)} className="paper rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-bark-soft">
              {label}
            </p>
            <p className="font-display text-3xl text-bark">{value}</p>
          </div>
        ))}
      </div>

      <section className="paper mt-8 rounded-2xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-bark">
              What we need from you
            </h2>
            <p className="text-sm text-bark-soft">
              Totals across {counts.total} boxes · drop at the packing shed by
              Thursday {formatWeekDate(week.startDate)} week
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              status?.ready
                ? "bg-moss/15 text-moss-dark"
                : "bg-wheat/25 text-bark"
            }`}
          >
            {status?.ready ? "Marked ready" : "Awaiting your confirmation"}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="mt-5 text-bark-soft">
            Nothing from your fields in this week&apos;s box. Ops will be in
            touch when you&apos;re back on the sheet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-linen text-xs uppercase tracking-wider text-bark-soft">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Per S / M / L</th>
                  <th className="py-2 text-right">Total needed</th>
                  <th className="py-2 text-right">On hand</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ line, total, inventory: onHand }) => {
                  const short = onHand < total;
                  return (
                    <tr key={line.boxItemId} className="border-b border-linen/60">
                      <td className="py-3">
                        <span className="mr-2">{line.emoji}</span>
                        <span className="font-semibold text-bark">
                          {line.name}
                        </span>
                        <span className="block text-xs text-bark-soft">
                          measured in {line.unit}
                        </span>
                      </td>
                      <td className="py-3 text-center text-bark-soft">
                        {line.qtySmall} / {line.qtyMedium} / {line.qtyLarge}
                      </td>
                      <td className="py-3 text-right font-display text-xl text-bark">
                        {total}{" "}
                        <span className="text-xs text-bark-soft">
                          {line.unit}
                        </span>
                      </td>
                      <td className="py-3 text-right text-bark-soft">
                        {onHand}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            short
                              ? "bg-brick/10 text-brick"
                              : "bg-moss/15 text-moss-dark"
                          }`}
                        >
                          {short ? "Short" : "Covered"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form
          action={farmReadyAction}
          className="mt-6 grid gap-3 rounded-2xl border border-linen bg-cream/60 p-4 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <input type="hidden" name="weekId" value={week.id} />
          <input
            type="hidden"
            name="ready"
            value={status?.ready ? "no" : "yes"}
          />
          <div>
            <label className="label" htmlFor="readyNote">
              Note for ops (substitutions, short counts, pickup timing)
            </label>
            <input
              id="readyNote"
              name="readyNote"
              className="field"
              defaultValue={status?.readyNote ?? ""}
              placeholder="Corn is a day behind — will have it by 9am"
            />
          </div>
          <button
            className={`rounded-full px-6 py-3 font-semibold transition ${
              status?.ready
                ? "border border-linen bg-cream text-bark hover:bg-parchment"
                : "bg-moss text-cream hover:bg-moss-dark"
            }`}
          >
            {status?.ready ? "Undo ready" : "Mark my load ready"}
          </button>
        </form>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="paper rounded-2xl p-6">
          <h2 className="font-display text-2xl text-bark">
            Next week&apos;s draft
          </h2>
          <p className="text-sm text-bark-soft">
            {nextWeek ? nextWeek.label : "Not scheduled yet"}
          </p>
          {nextWeekLines.length === 0 ? (
            <p className="mt-4 text-sm text-bark-soft">
              Ops hasn&apos;t placed any of your items in next week&apos;s box
              yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {nextWeekLines.map((line) => (
                <li key={line.boxItemId} className="flex justify-between">
                  <span>
                    {line.emoji} {line.name}
                  </span>
                  <span className="text-bark-soft">
                    {line.qtySmall}/{line.qtyMedium}/{line.qtyLarge}{" "}
                    {line.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="paper rounded-2xl p-6">
          <h2 className="font-display text-2xl text-bark">Your inventory</h2>
          <p className="text-sm text-bark-soft">
            What ops can pull from when building boxes.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {inventory.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.emoji} {item.name}
                </span>
                <span className="text-bark-soft">
                  {item.inventoryQty} {item.unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-8 text-xs text-bark-soft">
        Box sizes: {BOX_SIZES.map((s) => `${s.label} (${s.serves})`).join(" · ")}
      </p>
    </main>
  );
}
