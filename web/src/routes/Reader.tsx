import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function Reader() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-[680px] px-7 py-[60px]">
        <Link
          to="/"
          className="mb-12 flex items-center gap-1.5 font-mono text-xs text-ink-4 no-underline"
        >
          <ChevronLeft size={12} /> Back to dashboard
        </Link>

        <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-4">
          The Paris Review · Essay · Demo article
        </div>

        <h1 className="mb-3.5 font-display text-[40px] font-medium leading-[1.1] tracking-[-0.025em] text-ink">
          On the quiet art of marginalia
        </h1>

        <div className="mb-10 font-ui text-[13px] text-ink-3">
          By Helen Shaw · 12 min read
        </div>

        <article
          className="font-display text-[18px] leading-[1.65] tracking-[-0.005em] text-ink"
          data-article="true"
        >
          <p className="mb-5">
            A book that has been read, <em>truly read</em>, is never the same
            object twice. The reader returns from the page carrying something
            back with them—a phrase, a doubt, a small bright idea—and they leave
            a mark in return.{" "}
            <span className="h">
              The margins are where the argument happens: a private
              correspondence between the reader and the text, conducted in
              pencil.
            </span>
          </p>

          <p className="mb-5">
            The web was supposed to be good at this. It was supposed to be the
            most marginalia-friendly medium in history—infinite margins,
            infinite ink.{" "}
            <span className="h rose has-note">
              Instead we got the highlight as a kind of applause, a way of
              saying
              <em> yes, this</em> into the void.
            </span>
          </p>

          <p className="mb-5">
            What I want, what I have always wanted, is a thinner layer. One that
            sits on the page without changing it. One that lets me talk back.
          </p>

          <p className="mb-5">
            The footnote is the oldest form of hypertext. Long before we had
            links, we had the asterisk and the dagger, leading the eye downward
            to the small print where the author hedged, clarified, confessed.
            Every book is a collaboration between the reader and the writer,
            even when the writer doesn't know it.
          </p>

          <p className="mb-5">
            There is a kind of reading that leaves no marks—rapid, efficient,
            extractive. And then there is the other kind, the kind that makes
            you put the book down and stare at the ceiling. That kind always
            leaves something behind.
          </p>

          <p className="mb-5">
            I have been told that underlining is a sign of immaturity. That the
            mature reader holds the meaning in their head. But I suspect the
            opposite is true. The person who underlines is the person who knows
            that the meaning will not hold itself, that the mind leaks, that
            what passes through it must be caught.
          </p>

          <blockquote className="my-8 border-l-2 border-hl-amber pl-5 text-[20px] italic leading-[1.4] text-ink-2">
            <span className="h">
              Every annotation is an act of faith—a belief that the thought is
              worth preserving, that you will return.
            </span>
          </blockquote>

          <p className="mb-5">
            Select any passage on this page to see the Marginalia extension
            toolbar. Click a colour swatch to save a highlight. Your highlights
            sync to the dashboard instantly.
          </p>
        </article>

        <div className="mt-12 rounded-lg border border-rule bg-paper-2 p-4 text-xs text-ink-3">
          <p>
            <strong className="text-ink-2">Demo article.</strong> Select any
            text above and the Marginalia in-page toolbar will appear.
            Highlights save to your Convex backend and appear in the dashboard
            immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
