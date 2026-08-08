import Link from "next/link";
import { customerLoginAction } from "@/app/actions";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  await ensureSeed();

  return (
    <main className="mx-auto flex max-w-md flex-col px-5 py-20">
      <h1 className="font-display text-4xl text-bark">Welcome back</h1>
      <p className="mt-2 text-bark-soft">
        Sign in with the email on your subscription to manage your box.
      </p>
      {params.error === "notfound" ? (
        <p className="mt-5 rounded-xl border border-brick/30 bg-brick/10 px-4 py-3 text-sm text-brick">
          We couldn&apos;t find a subscription with that email.{" "}
          <Link href="/join" className="underline">
            Start one?
          </Link>
        </p>
      ) : null}
      <form action={customerLoginAction} className="paper mt-6 rounded-2xl p-6">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="field"
          placeholder="you@example.com"
          required
        />
        <button
          type="submit"
          className="mt-4 w-full rounded-full bg-moss px-6 py-3 font-semibold text-cream transition hover:bg-moss-dark"
        >
          Sign in
        </button>
      </form>
      <div className="paper mt-6 rounded-2xl p-5 text-sm text-bark-soft">
        <p className="font-semibold text-bark">Demo accounts</p>
        <p className="mt-1">
          Customer: <code className="text-clay">dana@example.com</code> (has
          delivery history) · Farm portal code:{" "}
          <code className="text-clay">willow</code> · Ops passcode:{" "}
          <code className="text-clay">harvest</code>
        </p>
      </div>
    </main>
  );
}
