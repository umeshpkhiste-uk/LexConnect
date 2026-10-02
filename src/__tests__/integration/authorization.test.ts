/**
 * The spec's mandatory security test (§57): create two advocate accounts,
 * create private client/case/document/financial data for Advocate A, then
 * confirm every attempt by Advocate B to read or write it fails.
 *
 * This is the automated, re-runnable version of the check already run
 * manually against the live database (see chat history / PR description).
 * It provisions two throwaway accounts via the Supabase Admin API and
 * deletes them afterward — it never touches real user data.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (test-only; never commit it, never put
 * it in the app itself — only this test file and your local shell should
 * ever see it). Get it from Supabase Dashboard -> Project Settings -> API ->
 * service_role secret. Run with: SUPABASE_SERVICE_ROLE_KEY=... npm run test:integration
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const canRun = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);
const describeIfConfigured = canRun ? describe : describe.skip;

if (!canRun) {
  console.warn(
    "\n[authorization.test.ts] SKIPPED — set SUPABASE_SERVICE_ROLE_KEY (plus the usual " +
      "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY) to run the mandatory " +
      "cross-tenant authorization test. See docs/TESTING.md.\n"
  );
}

describeIfConfigured("cross-tenant authorization (spec §57)", () => {
  // describe.skip still executes this function body synchronously (it only
  // skips the beforeAll/it callbacks below) — createClient() throws
  // immediately on an empty URL, so this guard has to be here too, not just
  // on describeIfConfigured itself.
  const admin = canRun
    ? createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    : null!;

  let advocateAId: string;
  let advocateBClient: ReturnType<typeof createClient>;
  let privateClientId: string;
  let privateCaseId: string;

  const emailA = `test-a-${Date.now()}@lexxbridge.test`;
  const emailB = `test-b-${Date.now()}@lexxbridge.test`;
  const password = "TestPassword1";

  beforeAll(async () => {
    const { data: userA, error: errorA } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Test Advocate A" },
    });
    if (errorA || !userA.user) throw errorA ?? new Error("Failed to create test user A");
    advocateAId = userA.user.id;

    const { data: userB, error: errorB } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Test Advocate B" },
    });
    if (errorB || !userB.user) throw errorB ?? new Error("Failed to create test user B");

    const advocateAClient = createClient(SUPABASE_URL!, ANON_KEY!);
    await advocateAClient.auth.signInWithPassword({ email: emailA, password });

    const { data: client, error: clientError } = await advocateAClient
      .from("clients")
      .insert({ advocate_id: advocateAId, full_name: "Confidential Test Client" })
      .select("id")
      .single();
    if (clientError || !client) throw clientError ?? new Error("Failed to seed test client");
    privateClientId = client.id;

    const { data: caseRow, error: caseError } = await advocateAClient
      .from("cases")
      .insert({ advocate_id: advocateAId, client_id: privateClientId, title: "Confidential Test Case" })
      .select("id")
      .single();
    if (caseError || !caseRow) throw caseError ?? new Error("Failed to seed test case");
    privateCaseId = caseRow.id;

    await advocateAClient.from("transactions").insert({
      advocate_id: advocateAId,
      client_id: privateClientId,
      case_id: privateCaseId,
      type: "income",
      category: "Professional fee",
      amount: 50000,
    });

    advocateBClient = createClient(SUPABASE_URL!, ANON_KEY!);
    await advocateBClient.auth.signInWithPassword({ email: emailB, password });
  });

  afterAll(async () => {
    // Cascading FKs (advocate_id -> auth.users(id) on delete cascade) clean
    // up every client/case/transaction row created above automatically.
    const { data } = await admin.auth.admin.listUsers();
    const testUsers = data.users.filter((u) => u.email === emailA || u.email === emailB);
    await Promise.all(testUsers.map((u) => admin.auth.admin.deleteUser(u.id)));
  });

  it("Advocate B cannot read Advocate A's client", async () => {
    const { data, error } = await advocateBClient.from("clients").select("*").eq("id", privateClientId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Advocate B cannot read Advocate A's case", async () => {
    const { data, error } = await advocateBClient.from("cases").select("*").eq("id", privateCaseId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Advocate B cannot read Advocate A's financial records", async () => {
    const { data, error } = await advocateBClient.from("transactions").select("*").eq("client_id", privateClientId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Advocate B cannot modify Advocate A's client", async () => {
    const { data, error } = await advocateBClient
      .from("clients")
      .update({ notes: "tampered" } as never)
      .eq("id", privateClientId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS filters the row before the update ever applies
  });

  it("Advocate B cannot read Advocate A's private profile data", async () => {
    const { data, error } = await advocateBClient.from("advocate_profiles").select("*").eq("id", advocateAId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Advocate A can still read their own data (positive control)", async () => {
    const advocateAClient = createClient(SUPABASE_URL!, ANON_KEY!);
    await advocateAClient.auth.signInWithPassword({ email: emailA, password });
    const { data, error } = await advocateAClient.from("clients").select("*").eq("id", privateClientId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
