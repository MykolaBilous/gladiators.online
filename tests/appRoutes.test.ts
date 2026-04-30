import { describe, expect, it } from "vitest";
import {
  appRoutes,
  defaultRoutePath,
  normalizeRoutePath,
} from "../src/app/routes";

describe("platform routes", () => {
  it("defines the stage six platform routes", () => {
    expect(appRoutes.map((route) => route.path)).toEqual([
      "/arena",
      "/animations",
      "/login",
      "/profile",
      "/messages",
      "/settings",
    ]);
  });

  it("normalizes root and unknown paths to the arena", () => {
    expect(normalizeRoutePath("/")).toBe(defaultRoutePath);
    expect(normalizeRoutePath("/unknown")).toBe(defaultRoutePath);
  });

  it("accepts configured routes with or without a trailing slash", () => {
    expect(normalizeRoutePath("/profile")).toBe("/profile");
    expect(normalizeRoutePath("/profile/")).toBe("/profile");
  });
});
