import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-50">
      <main className="w-full max-w-2xl space-y-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-amber-400">
          HUSAI-OS · Restaurant OS
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Run your restaurant from one place
        </h1>
        <p className="text-lg leading-8 text-zinc-400">
          Menus, orders, kitchen display, inventory, and daily analytics —
          built for speed during service hours.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-300"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm text-zinc-300 hover:border-zinc-500"
          >
            Get started
          </Link>
        </div>
      </main>
    </div>
  );
}
