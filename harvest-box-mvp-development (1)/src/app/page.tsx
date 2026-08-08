import Link from "next/link";
import {
  BOX_SIZES,
  formatWeekDate,
  getAllFarms,
  getBoxContents,
  getCurrentWeek,
  getSubscriberStats,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const week = await getCurrentWeek();
  const [contents, farms, stats] = await Promise.all([
    getBoxContents(week.id),
    getAllFarms(),
    getSubscriberStats(),
  ]);

  const farmsInBox = new Map(
    contents.map((line) => [line.farmId, line.farmName]),
  );

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-linen">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-crate.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bark/85 via-bark/65 to-bark/25" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cream/30 bg-cream/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cream/90">
            🌾 {week.label} · packed Thursday
          </p>
          <h1 className="max-w-2xl font-display text-4xl leading-[1.08] text-cream sm:text-6xl">
            The food from the farms down the road, in a box on your porch.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/85">
            No warehouse, no middlemen, no plastic clamshells. Three family
            farms within 15 miles pick on Wednesday, we pack on Thursday, and
            you eat it on Friday.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/join"
              className="rounded-full bg-clay px-6 py-3 font-semibold text-cream shadow-lg transition hover:bg-clay-dark"
            >
              Start a weekly box
            </Link>
            <Link
              href="#this-week"
              className="rounded-full border border-cream/40 px-6 py-3 font-semibold text-cream transition hover:bg-cream/10"
            >
              See what&apos;s in it this week
            </Link>
          </div>
          <dl className="mt-10 flex flex-wrap gap-8 text-cream/90">
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-cream/60">
                Neighbours subscribed
              </dt>
              <dd className="font-display text-2xl">{stats.active}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-cream/60">
                Partner farms
              </dt>
              <dd className="font-display text-2xl">{farms.length}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-cream/60">
                Furthest field
              </dt>
              <dd className="font-display text-2xl">
                {Math.max(...farms.map((f) => f.milesAway), 0)} mi
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* This week's box */}
      <section id="this-week" className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-bark">
              What&apos;s in the box this week
            </h2>
            <p className="mt-1 text-bark-soft">
              {week.label} · delivered Friday{" "}
              {formatWeekDate(week.startDate)} week
              {week.note ? ` · ${week.note}` : ""}
            </p>
          </div>
          <p className="text-sm text-bark-soft">
            From{" "}
            <span className="font-semibold text-moss">
              {[...farmsInBox.values()].join(", ") || "our partner farms"}
            </span>
          </p>
        </div>

        {contents.length === 0 ? (
          <p className="paper mt-6 rounded-2xl p-8 text-bark-soft">
            This week&apos;s box is still being packed by our ops team. Check
            back shortly.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contents.map((line) => (
              <article
                key={line.boxItemId}
                className="paper flex items-start gap-4 rounded-2xl p-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-parchment text-2xl">
                  {line.emoji}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg leading-tight text-bark">
                    {line.name}
                  </h3>
                  <p className="text-sm text-bark-soft">
                    {line.farmEmoji} {line.farmName} · {line.farmTown}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-moss">
                    {line.qtySmall}/{line.qtyMedium}/{line.qtyLarge}{" "}
                    {line.unit} per S/M/L box
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Box sizes */}
      <section className="border-y border-linen bg-parchment/50 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-3xl text-bark">Pick your size</h2>
          <p className="mt-1 max-w-xl text-bark-soft">
            Same produce, different volume. Change size or skip any week — no
            contract, cancel whenever the season turns.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {BOX_SIZES.map((size) => (
              <div
                key={size.key}
                className="paper flex flex-col rounded-2xl p-6"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl text-bark">
                    {size.label}
                  </h3>
                  <span className="font-display text-xl text-clay">
                    ${size.price}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-moss">
                  Serves {size.serves} · per week
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-bark-soft">
                  {size.blurb}
                </p>
                <ul className="mt-4 space-y-1 text-sm text-bark-soft">
                  {contents.slice(0, 4).map((line) => {
                    const qty =
                      size.key === "small"
                        ? line.qtySmall
                        : size.key === "large"
                          ? line.qtyLarge
                          : line.qtyMedium;
                    return (
                      <li key={line.boxItemId}>
                        {line.emoji} {qty} {line.unit} {line.name.toLowerCase()}
                      </li>
                    );
                  })}
                  {contents.length > 4 ? (
                    <li className="text-bark-soft/70">
                      + {contents.length - 4} more this week
                    </li>
                  ) : null}
                </ul>
                <Link
                  href={`/join?size=${size.key}`}
                  className="mt-6 rounded-full bg-moss px-5 py-2.5 text-center font-semibold text-cream transition hover:bg-moss-dark"
                >
                  Choose {size.label}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Farms */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl text-bark">
              The people who grow it
            </h2>
            <div className="mt-6 space-y-4">
              {farms.map((farm) => (
                <div key={farm.id} className="paper rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl text-bark">
                      {farm.emoji} {farm.name}
                    </h3>
                    <span className="rounded-full bg-parchment px-3 py-1 text-xs font-semibold uppercase tracking-wider text-bark-soft">
                      {farm.milesAway} mi · {farm.town}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-bark-soft">
                    {farm.story}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div
            className="min-h-[320px] rounded-3xl border border-linen bg-cover bg-center shadow-lg lg:min-h-[440px]"
            style={{ backgroundImage: "url('/images/farmers.jpg')" }}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="paper rounded-3xl p-8">
          <h2 className="font-display text-3xl text-bark">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Subscribe", "Pick a size and tell us where the porch is."],
              ["We tell the farms", "Monday: totals go out to each farm."],
              ["They pick", "Wednesday: harvested to order, nothing sits."],
              ["You eat", "Friday: box on the doorstep by 6pm."],
            ].map(([title, copy], index) => (
              <li key={title}>
                <span className="font-display text-3xl text-clay/60">
                  0{index + 1}
                </span>
                <h3 className="mt-1 font-display text-xl text-bark">{title}</h3>
                <p className="mt-1 text-sm text-bark-soft">{copy}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/join"
              className="rounded-full bg-clay px-6 py-3 font-semibold text-cream transition hover:bg-clay-dark"
            >
              Start your box
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-linen px-6 py-3 font-semibold text-bark transition hover:bg-parchment"
            >
              I already subscribe
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
