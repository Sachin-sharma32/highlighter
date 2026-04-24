import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function Reader() {
  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 28px" }}>
        <Link
          to="/"
          className="flex items-center gap-1.5 mb-12 text-xs"
          style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", textDecoration: "none" }}
        >
          <ChevronLeft size={12} /> Back to dashboard
        </Link>

        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
          The Paris Review  ·  Essay  ·  Demo article
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 40, lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: 14, color: "var(--ink)" }}>
          On the quiet art of marginalia
        </h1>

        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-3)", marginBottom: 40 }}>
          By Helen Shaw  ·  12 min read
        </div>

        <article
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            lineHeight: 1.65,
            color: "var(--ink)",
            letterSpacing: "-0.005em",
          }}
          data-article="true"
        >
          <p style={{ marginBottom: 20 }}>
            A book that has been read, <em>truly read</em>, is never the same
            object twice. The reader returns from the page carrying something
            back with them—a phrase, a doubt, a small bright idea—and
            they leave a mark in return.{" "}
            <span className="h">
              The margins are where the argument happens: a private
              correspondence between the reader and the text, conducted in pencil.
            </span>
          </p>

          <p style={{ marginBottom: 20 }}>
            The web was supposed to be good at this. It was supposed to be the
            most marginalia-friendly medium in history—infinite margins, infinite
            ink.{" "}
            <span className="h rose has-note">
              Instead we got the highlight as a kind of applause, a way of saying
              <em> yes, this</em> into the void.
            </span>
          </p>

          <p style={{ marginBottom: 20 }}>
            What I want, what I have always wanted, is a thinner layer. One that
            sits on the page without changing it. One that lets me talk back.
          </p>

          <p style={{ marginBottom: 20 }}>
            The footnote is the oldest form of hypertext. Long before we had
            links, we had the asterisk and the dagger, leading the eye downward
            to the small print where the author hedged, clarified, confessed.
            Every book is a collaboration between the reader and the writer, even
            when the writer doesn't know it.
          </p>

          <p style={{ marginBottom: 20 }}>
            There is a kind of reading that leaves no marks—rapid, efficient,
            extractive. And then there is the other kind, the kind that makes
            you put the book down and stare at the ceiling. That kind always
            leaves something behind.
          </p>

          <p style={{ marginBottom: 20 }}>
            I have been told that underlining is a sign of immaturity. That the
            mature reader holds the meaning in their head. But I suspect the
            opposite is true. The person who underlines is the person who knows
            that the meaning will not hold itself, that the mind leaks, that what
            passes through it must be caught.
          </p>

          <blockquote
            style={{
              borderLeft: "2px solid var(--hl-amber)",
              paddingLeft: 20,
              margin: "32px 0",
              fontStyle: "italic",
              color: "var(--ink-2)",
              fontSize: 20,
              lineHeight: 1.4,
            }}
          >
            <span className="h">
              Every annotation is an act of faith—a belief that the thought is
              worth preserving, that you will return.
            </span>
          </blockquote>

          <p style={{ marginBottom: 20 }}>
            Select any passage on this page to see the Marginalia extension toolbar.
            Click a colour swatch to save a highlight. Your highlights sync to the
            dashboard instantly.
          </p>
        </article>

        <div
          className="mt-12 rounded-lg p-4"
          style={{ background: "var(--paper-2)", border: "1px solid var(--rule)", fontSize: 12, color: "var(--ink-3)" }}
        >
          <p>
            <strong style={{ color: "var(--ink-2)" }}>Demo article.</strong>{" "}
            Select any text above and the Marginalia in-page toolbar will appear.
            Highlights save to your Convex backend and appear in the dashboard immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
