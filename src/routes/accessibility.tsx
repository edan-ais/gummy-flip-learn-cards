import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility · StudyLamb" },
      {
        name: "description",
        content:
          "StudyLamb's accessibility statement: our commitment to ADA and WCAG 2.1 AA, the features we build in, and how to reach us.",
      },
      { property: "og:title", content: "Accessibility · StudyLamb" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <main className="page" aria-labelledby="a11y-title">
      <h1 id="a11y-title" className="page-title">
        Accessibility statement
      </h1>
      <p className="mt-2 text-muted-foreground">Last updated November 26, 2026</p>

      <section className="mt-6" aria-labelledby="a11y-commitment">
        <h2 id="a11y-commitment" className="text-lg font-extrabold">
          Our commitment
        </h2>
        <p className="mt-2">
          StudyLamb is built for students who learn differently, including students with ADHD and dyslexia. We want
          everyone to be able to use it. We work to meet the Americans with Disabilities Act (ADA) and the Web Content
          Accessibility Guidelines (WCAG) 2.1, Level AA.
        </p>
      </section>

      <section className="mt-6" aria-labelledby="a11y-features">
        <h2 id="a11y-features" className="text-lg font-extrabold">
          What we build in
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A skip link to jump straight to the main content.</li>
          <li>Full keyboard navigation with a visible focus outline.</li>
          <li>Semantic headings, landmarks and labels that work with screen readers.</li>
          <li>Text alternatives for images and icons that carry meaning.</li>
          <li>A calm layout with strong color contrast and Lexend, a font designed for easier reading.</li>
          <li>Read-aloud and podcast audio so you can listen as well as read.</li>
          <li>Text that resizes with your browser or device settings.</li>
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="a11y-limits">
        <h2 id="a11y-limits" className="text-lg font-extrabold">
          Known limits
        </h2>
        <p className="mt-2">
          Some study material you upload, such as scanned PDFs or images, may not be readable by assistive technology
          until StudyLamb converts it to text. We keep testing and improving every part of the app.
        </p>
      </section>

      <section className="mt-6" aria-labelledby="a11y-contact">
        <h2 id="a11y-contact" className="text-lg font-extrabold">
          Tell us about a problem
        </h2>
        <p className="mt-2">
          If something is hard to use, email{" "}
          <a className="underline" href="mailto:humans@waiwiser.com?subject=StudyLamb%20accessibility">
            humans@waiwiser.com
          </a>{" "}
          and tell us the page and what happened. We aim to reply within 2 business days and to fix the problem
          promptly.
        </p>
      </section>

      <Link to="/" className="gummy-btn mt-8" data-variant="primary">
        Back to StudyLamb
      </Link>
    </main>
  );
}
