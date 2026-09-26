import { clientCaseTargets } from "./clientCases";

const c = (id: string, created_at: string, is_archived = false) => ({ id, title: id, status: "active", created_at, is_archived });

describe("clientCaseTargets", () => {
  it("lists open cases newest first and skips archived ones", () => {
    expect(clientCaseTargets([c("old", "2026-01-01"), c("arch", "2026-09-01", true), c("new", "2026-05-01")]).map((x) => x.id)).toEqual([
      "new",
      "old",
    ]);
  });

  it("falls back to archived cases when there are no open ones", () => {
    expect(clientCaseTargets([c("a", "2026-01-01", true), c("b", "2026-02-01", true)]).map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("returns nothing for a client without cases", () => {
    expect(clientCaseTargets([])).toEqual([]);
  });
});
