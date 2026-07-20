import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
      <div className="eyebrow text-fgMuted">404</div>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-fg sm:text-4xl">This page doesn&apos;t exist</h1>
      <p className="mt-3 max-w-md text-sm text-fgMuted">
        The page you&apos;re looking for moved or never existed. Head back to the studio to make a video.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90">
          Back home
        </Link>
        <Link href="/studio" className="rounded-full border border-line2 px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-fg">
          Open the Studio
        </Link>
      </div>
    </section>
  );
}
