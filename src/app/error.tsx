"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-lg">
      <p className="eyebrow">Could not finish</p>
      <h1 className="mt-2 font-serif text-4xl">The books did not update.</h1>
      <p className="mt-3 text-ink-soft">{error.message}</p>
      <button type="button" className="btn-primary mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
