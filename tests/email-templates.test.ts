import { describe, expect, it } from "vitest";
import { renderEmail } from "@/server/mail/templates";

describe("email templates", () => {
  it("puts the code in the subject, text and HTML", () => {
    const e = renderEmail("verify_email", {
      firstName: "Femi",
      code: "042317",
    });
    expect(e.subject).toBe("042317 is your RentARide code");
    expect(e.text).toContain("042317");
    expect(e.html).toContain("042317");
    expect(e.html).toContain("<!doctype html>");
  });

  it("escapes user-provided text in HTML", () => {
    const e = renderEmail("notification", {
      firstName: "<b>Eve</b>",
      title: "Dispute update",
      body: '<script>alert("x")</script>',
      url: "https://rentaride.ng/dashboard",
    });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("&lt;b&gt;Eve&lt;/b&gt;");
    expect(e.html).toContain("Open RentARide");
  });

  it("renders the reset button with the link", () => {
    const e = renderEmail("password_reset", {
      firstName: "Femi",
      url: "http://localhost:3001/reset-password?token=abc",
    });
    // Handlebars entity-escapes attribute values (= becomes &#x3D;); browsers decode them.
    const decoded = e.html.replaceAll("&#x3D;", "=");
    expect(decoded).toContain(
      'href="http://localhost:3001/reset-password?token=abc"',
    );
    expect(e.text).toContain("token=abc");
  });
});
