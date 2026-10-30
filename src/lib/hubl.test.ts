import { describe, expect, it } from "vitest";
import { CHECKOUT_ENABLED, HUBL_ORG, chargeSucceeded } from "./hubl";
describe("HUBLNet purchases", () => {
  it("checkout stays off", () => expect(CHECKOUT_ENABLED).toBe(false));
  it("uses the Helping Unite Businesses org", () => expect(HUBL_ORG).toBe("04ca9689-9d94-4c69-87c4-5ade501c730c"));
  it("credits only a confirmed successful charge", () => {
    expect(chargeSucceeded({ ok: true, status: "approved", transaction_id: "t1" })).toBe(true);
    expect(chargeSucceeded({ ok: true, status: "declined", transaction_id: "t1" })).toBe(false);
    expect(chargeSucceeded({ ok: false, status: "approved", transaction_id: "t1" })).toBe(false);
    expect(chargeSucceeded({ ok: true, status: "approved" })).toBe(false);
  });
});
