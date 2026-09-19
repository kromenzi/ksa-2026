import { describe, expect, it } from "vitest";
import { RESOURCE_MAP } from "../api/_lib/resource-map";

describe("resource registry", () => {
  it("contains critical HSE resources", () => {
    for (const key of ["hse-actions", "ptw-permits", "fire-devices", "risk-register", "monthly-hse-reports"]) {
      expect(RESOURCE_MAP[key]).toBeDefined();
    }
  });

  it("maps every resource to a table and module", () => {
    for (const config of Object.values(RESOURCE_MAP)) {
      expect(config.table).toBeTruthy();
      expect(config.module).toBeTruthy();
    }
  });
});
