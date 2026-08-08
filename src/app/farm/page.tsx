import { farmLoginAction } from "@/app/actions";
import { getAllFarms } from "@/lib/data";
import { getFarmId } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FarmLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  if (await getFarmId()) redirect("/farm/dashboard");
  const farms = await getAllFarms();

  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">
            Grower portal
          </p>
          <h1 className="mt-2 font-display text-4xl text-bark">
            Sign in to your farm sheet
          </h1>
          <p className="mt-3 text-bark-soft">
            See exactly how many bunches, pounds and pints Harvest Box needs
            from your fields this week, then mark your load ready for pickup.
          </p>
          {params.error ? (
            <p className="mt-5 rounded-xl border border-brick/30 bg-brick/10 px-4 py-3 text-sm text-brick">
              That code doesn&apos;t match the farm. Try again.
            </p>
          ) : null}
          <form action={farmLoginAction} className="paper mt-6 rounded-2xl p-6">
            <label className="label" htmlFor="slug">
              Farm
            </label>
            <select id="slug" name="slug" className="field" required>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.slug}>
                  {farm.emoji} {farm.name} — {farm.town}
                </option>
              ))}
            </select>
            <div className="mt-4">
              <label className="label" htmlFor="code">
                Access code
              </label>
              <input
                id="code"
                name="code"
                className="field"
                placeholder="willow"
                required
              />
            </div>
            <button className="mt-5 w-full rounded-full bg-moss px-6 py-3 font-semibold text-cream transition hover:bg-moss-dark">
              Open my sheet
            </button>
            <p className="mt-3 text-xs text-bark-soft">
              Demo codes: willow · stone · creek
            </p>
          </form>
        </div>
        <div className="space-y-4">
          {farms.map((farm) => (
            <div key={farm.id} className="paper rounded-2xl p-5">
              <h2 className="font-display text-xl text-bark">
                {farm.emoji} {farm.name}
              </h2>
              <p className="text-xs uppercase tracking-wider text-moss">
                {farm.town} · {farm.milesAway} miles from the packing shed
              </p>
              <p className="mt-2 text-sm leading-relaxed text-bark-soft">
                {farm.story}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
