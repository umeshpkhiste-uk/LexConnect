/**
 * PIN code lookups via India Post's public API (api.postalpincode.in). Only
 * a city name or a PIN code is sent — nothing about the user.
 */

type PostOffice = { Name: string; Pincode: string; District: string; State: string };
type ApiResponse = { Status: string; PostOffice: PostOffice[] | null }[];

const BASE = "https://api.postalpincode.in";

async function getJson(url: string): Promise<ApiResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as ApiResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const sameState = (a: string, b: string) => {
  const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
  return norm(a) === norm(b) || (norm(b) === "delhi" && norm(a).includes("delhi"));
};

export type PincodeOption = { pincode: string; label: string };

/** PIN codes for post offices in a city (matching the state), e.g.
 * "411001 · Pune City". Empty if the lookup fails or finds nothing. */
export async function pincodesForCity(city: string, state: string): Promise<PincodeOption[]> {
  const name = city.replace(/\s*\(.*\)\s*/g, "").trim();
  if (!name) return [];
  const data = await getJson(`${BASE}/postoffice/${encodeURIComponent(name)}`);
  const offices = data?.[0]?.Status === "Success" ? (data[0].PostOffice ?? []) : [];
  const byPin = new Map<string, string[]>();
  for (const office of offices) {
    if (state && !sameState(office.State, state)) continue;
    const names = byPin.get(office.Pincode) ?? [];
    if (names.length < 2) names.push(office.Name);
    byPin.set(office.Pincode, names);
  }
  return [...byPin.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pincode, names]) => ({ pincode, label: `${pincode} · ${names.join(", ")}` }));
}

/** District and state for a PIN code, or null if unknown / offline. */
export async function lookupPincode(pincode: string): Promise<{ district: string; state: string } | null> {
  const data = await getJson(`${BASE}/pincode/${encodeURIComponent(pincode)}`);
  const office = data?.[0]?.Status === "Success" ? data[0].PostOffice?.[0] : undefined;
  return office ? { district: office.District, state: office.State } : null;
}

export { sameState as isSameState };
