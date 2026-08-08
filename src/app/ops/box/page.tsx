import Link from "next/link";
import { redirect } from "next/navigation";
import { saveBoxAction } from "@/app/actions";
import {
  getAllProduceWithFarm,
  getAllWeeks,
  getBoxContents,
  getCurrentWeek,
  getWeekBoxCounts,
  getWeekById,
} from "@/lib/data";
import { isOps } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BoxBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; saved?: string }>;
}) {
  const params = await searchParams;
  if (!(await isOps())) redirect("/ops");

  const allWeeks = await getAllWeeks();
  const requested = Number(params.week);
  const week =
    (Number.isFinite(requested) ? await getWeekById(requested) : null) ??
    (await getCurrentWeek());

  const [produce, existing, counts] = await Promise.all([
    getAllProduceWithFarm(),
    getBoxContents(week.id),
    getWeekBoxCounts(week.id),
  ]);

  const existingMap = new Map(existing.map((line) => [line.produceItemId, line]));

  const byFarm = new Map<
    number,
    { farmName: string; farmEmoji: string; items: typeof produce }
  >();
  for (const item of produce) {
    const entry = byFarm.get(item.farmId) ?? {
      farmName: item.farmName,
      farmEmoji: item.farmEmoji,
      items: [] as typeof produce,
    };
    entry.items.push(item);
    byFarm.set(item.farmId, entry);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">
            Box builder
          </p>
          <h1 className="font-display text-4xl text-bark">{week.label}</h1>
          <p className="mt-1 text-bark-soft">
            {counts.total} boxes on the books ({counts.small} S · {counts.medium}{" "}
            M · {counts.large} L) · status: {week.status}
          </p>
        </div>
        <Link
          href="/ops/dashboard"
          className="rounded-full border border-linen px-4 py-2 text-sm font-semibold text-bark transition hover:bg-parchment"
        >
          ← Back to ops
        </Link>
      </div>

      {params.saved ? (
        <p className="mt-6 rounded-xl border border-moss/30 bg-moss/10 px-4 py-3 text-sm text-moss-dark">
          Box saved. Farm sheets and customer dashboards now show the new
          contents.
        </p>
      ) : null}

      <form method="get" className="paper mt-6 flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <div className="min-w-[260px] flex-1">
          <label className="label" htmlFor="week">
            Editing week
          </label>
          <select
            id="week"
            name="week"
            defaultValue={String(week.id)}
            className="field"
          >
            {allWeeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label} — {w.status}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded-full border border-linen bg-cream px-5 py-2.5 text-sm font-semibold text-bark transition hover:bg-parchment">
          Switch week
        </button>
      </form>

      <form action={saveBoxAction} className="mt-6 space-y-6">
        <input type="hidden" name="weekId" value={week.id} />

        <div className="paper rounded-2xl p-6">
          <label className="label" htmlFor="note">
            Note printed on the box card
          </label>
          <input
            id="note"
            name="note"
            className="field"
            defaultValue={week.note}
            placeholder="Peak tomato week — eat them fast."
          />
        </div>

        {[...byFarm.entries()].map(([farmId, farm]) => (
          <section key={farmId} className="paper rounded-2xl p-6">
            <h2 className="font-display text-2xl text-bark">
              {farm.farmEmoji} {farm.farmName}
            </h2>
            <p className="text-xs uppercase tracking-wider text-bark-soft">
              Tick an item to include it, then set quantities per box size
            </p>
            <div className="mt-4 space-y-2">
              {farm.items.map((item) => {
                const line = existingMap.get(item.id);
                const included = Boolean(line);
                const needed = line
                  ? line.qtySmall * counts.small +
                    line.qtyMedium * counts.medium +
                    line.qtyLarge * counts.large
                  : 0;
                return (
                  <div
                    key={item.id}
                    className="grid items-center gap-3 rounded-xl border border-linen bg-cream/50 p-3 sm:grid-cols-[1.6fr_repeat(3,72px)_auto]"
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="include"
                        value={item.id}
                        defaultChecked={included}
                        className="h-4 w-4 accent-[var(--color-moss)]"
                      />
                      <span>
                        <span className="font-semibold text-bark">
                          {item.emoji} {item.name}
                        </span>
                        <span className="block text-xs text-bark-soft">
                          {item.inventoryQty} {item.unit} on hand
                        </span>
                      </span>
                    </label>
                    {(["s", "m", "l"] as const).map((size) => (
                      <div key={size}>
                        <label
                          className="label mb-0.5"
                          htmlFor={`${size}_${item.id}`}
                        >
                          {size.toUpperCase()}
                        </label>
                        <input
                          id={`${size}_${item.id}`}
                          name={`${size}_${item.id}`}
                          type="number"
                          min={0}
                          className="field py-1.5"
                          defaultValue={
                            line
                              ? size === "s"
                                ? line.qtySmall
                                : size === "m"
                                  ? line.qtyMedium
                                  : line.qtyLarge
                              : size === "s"
                                ? 1
                                : size === "m"
                                  ? 2
                                  : 3
                          }
                        />
                      </div>
                    ))}
                    <p className="text-right text-xs text-bark-soft">
                      {included ? (
                        <>
                          needs{" "}
                          <span
                            className={
                              needed > item.inventoryQty
                                ? "font-semibold text-brick"
                                : "font-semibold text-moss-dark"
                            }
                          >
                            {needed} {item.unit}
                          </span>
                        </>
                      ) : (
                        "not in box"
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-linen bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className="text-sm text-bark-soft">
            Saving replaces the entire contents list for {week.label}.
          </p>
          <button className="rounded-full bg-clay px-6 py-3 font-semibold text-cream transition hover:bg-clay-dark">
            Save this week&apos;s box
          </button>
        </div>
      </form>
    </main>
  );
}
