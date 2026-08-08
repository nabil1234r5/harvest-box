import { redirect } from "next/navigation";
import { opsLoginAction } from "@/app/actions";
import { isOps } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OpsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  if (await isOps()) redirect("/ops/dashboard");

  return (
    <main className="mx-auto max-w-md px-5 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">
        Operations
      </p>
      <h1 className="mt-2 font-display text-4xl text-bark">The back room</h1>
      <p className="mt-2 text-bark-soft">
        Subscriber counts, farm orders, the pack list and Friday&apos;s route.
      </p>
      {params.error ? (
        <p className="mt-5 rounded-xl border border-brick/30 bg-brick/10 px-4 py-3 text-sm text-brick">
          Wrong passcode.
        </p>
      ) : null}
      <form action={opsLoginAction} className="paper mt-6 rounded-2xl p-6">
        <label className="label" htmlFor="passcode">
          Ops passcode
        </label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          className="field"
          placeholder="harvest"
          required
        />
        <button className="mt-4 w-full rounded-full bg-clay px-6 py-3 font-semibold text-cream transition hover:bg-clay-dark">
          Unlock
        </button>
        <p className="mt-3 text-xs text-bark-soft">Demo passcode: harvest</p>
      </form>
    </main>
  );
}
