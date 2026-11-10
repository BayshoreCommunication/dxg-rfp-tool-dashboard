import { readMemberIdentity } from "./memberIdentity";

const token = (claims: unknown) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

describe("readMemberIdentity", () => {
  test("reads the member's id and roles from the access token", () => {
    expect(readMemberIdentity(token({ userId: "u1", roles: ["team_manager", 7, "planner"] }))).toEqual({ userId: "u1", roles: ["team_manager", "planner"] });
  });

  test("anything unreadable is nobody with no roles", () => {
    for (const value of [null, undefined, 42, "", "opaque-token", "a.b.c", token("text"), token({ roles: "owner" })]) {
      expect(readMemberIdentity(value)).toEqual({ userId: null, roles: [] });
    }
  });
});
