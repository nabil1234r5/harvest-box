import { cookies } from "next/headers";

export const CUSTOMER_COOKIE = "hb_customer";
export const FARM_COOKIE = "hb_farm";
export const OPS_COOKIE = "hb_ops";

export const OPS_PASSCODE = process.env.OPS_PASSCODE ?? "harvest";

const maxAge = 60 * 60 * 24 * 30;

export async function setCookieValue(name: string, value: string) {
  const store = await cookies();
  store.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearCookieValue(name: string) {
  const store = await cookies();
  store.delete(name);
}

export async function getCookieValue(name: string): Promise<string | null> {
  const store = await cookies();
  return store.get(name)?.value ?? null;
}

export async function getCustomerId(): Promise<number | null> {
  const raw = await getCookieValue(CUSTOMER_COOKIE);
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

export async function getFarmId(): Promise<number | null> {
  const raw = await getCookieValue(FARM_COOKIE);
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

export async function isOps(): Promise<boolean> {
  return (await getCookieValue(OPS_COOKIE)) === "yes";
}
