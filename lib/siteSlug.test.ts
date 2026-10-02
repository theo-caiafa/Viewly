import { describe, expect, it } from "vitest";
import { siteSlug } from "./siteSlug";

describe("siteSlug", () => {
  it("strips the www prefix and lowercases the hostname", () => {
    expect(siteSlug("https://www.Example.com/path")).toBe("example-com");
  });

  it("replaces non-alphanumeric characters with dashes", () => {
    expect(siteSlug("https://sub.example.co.uk")).toBe("sub-example-co-uk");
  });

  it("falls back to \"site\" for an invalid URL", () => {
    expect(siteSlug("not a url")).toBe("site");
  });
});
