import Link from "next/link";
import { subscribeAction } from "@/app/actions";
import { BOX_SIZES, getBoxContents, getCurrentWeek } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ size?: string; error?: string }>;
}) {
  const params = await searchParams;
  const week = await getCurrentWeek();
  const contents = await getBoxContents(week.id);
  const selected = BOX_SIZES.some((s) => s.key === params.size)
    ? params.size
    : "medium";

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-bark">
          Start your weekly box
        </h1>
        <p className="mt-2 max-w-2xl text-bark-soft">
          Nothing is charged today — this MVP just saves your subscription so
          the farms know how much to pick. First delivery goes out{" "}
          {week.label.toLowerCase()}.
        </p>
      </div>

      {params.error === "missing" ? (
        <p className="mb-6 rounded-xl border border-brick/30 bg-brick/10 px-4 py-3 text-sm text-brick">
          Please fill in your name, email and full delivery address.
        </p>
      ) : null}

      <form
        action={subscribeAction}
        className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start"
      >
        <div className="space-y-8">
          <section className="paper rounded-2xl p-6">
            <h2 className="font-display text-2xl text-bark">
              1 · Choose a box size
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {BOX_SIZES.map((size) => (
                <label
                  key={size.key}
                  className="group relative block cursor-pointer"
                >
                  <input
                    type="radio"
                    name="boxSize"
                    value={size.key}
                    defaultChecked={selected === size.key}
                    className="peer sr-only"
                  />
                  <div className="h-full rounded-xl border border-linen bg-cream/60 p-4 transition peer-checked:border-clay peer-checked:bg-clay/10 peer-checked:shadow-sm">
                    <p className="font-display text-lg leading-tight text-bark">
                      {size.label}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-moss">
                      {size.serves}
                    </p>
                    <p className="mt-2 font-display text-2xl text-clay">
                      ${size.price}
                      <span className="text-sm text-bark-soft">/wk</span>
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="paper rounded-2xl p-6">
            <h2 className="font-display text-2xl text-bark">2 · Who are you</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">
                  Name
                </label>
                <input id="name" name="name" className="field" required />
              </div>
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="field"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="phone">
                  Phone (for delivery day texts)
                </label>
                <input id="phone" name="phone" className="field" />
              </div>
            </div>
          </section>

          <section className="paper rounded-2xl p-6">
            <h2 className="font-display text-2xl text-bark">
              3 · Where it goes
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label className="label" htmlFor="street">
                  Street address
                </label>
                <input id="street" name="street" className="field" required />
              </div>
              <div className="sm:col-span-4">
                <label className="label" htmlFor="city">
                  Town
                </label>
                <input
                  id="city"
                  name="city"
                  className="field"
                  placeholder="Dunmore"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="zip">
                  Zip
                </label>
                <input
                  id="zip"
                  name="zip"
                  className="field"
                  placeholder="04021"
                  required
                />
              </div>
              <div className="sm:col-span-6">
                <label className="label" htmlFor="notes">
                  Drop-off notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="field"
                  placeholder="Side porch, gate is unlatched, dog is friendly…"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="paper sticky top-6 rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
            {week.label}
          </p>
          <h2 className="mt-1 font-display text-2xl text-bark">
            Your first box
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-bark-soft">
            {contents.map((line) => (
              <li key={line.boxItemId} className="flex items-start gap-2">
                <span>{line.emoji}</span>
                <span>
                  <span className="text-bark">{line.name}</span>
                  <span className="block text-xs">
                    {line.farmName} · {line.qtySmall}/{line.qtyMedium}/
                    {line.qtyLarge} {line.unit} S/M/L
                  </span>
                </span>
              </li>
            ))}
            {contents.length === 0 ? (
              <li>Box contents are being finalised.</li>
            ) : null}
          </ul>
          <div className="stitched my-5" />
          <p className="text-sm leading-relaxed text-bark-soft">
            Billing is handled the old-fashioned way for now — we&apos;ll settle
            up at the first delivery. Skip, pause or change size any time from
            your dashboard.
          </p>
          <button
            type="submit"
            className="mt-5 w-full rounded-full bg-clay px-6 py-3 font-semibold text-cream transition hover:bg-clay-dark"
          >
            Subscribe to Harvest Box
          </button>
          <p className="mt-3 text-center text-xs text-bark-soft">
            Already a member?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </aside>
      </form>
    </main>
  );
}
