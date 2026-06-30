"use client";

export function SignOutButton() {
  async function handleSignOut() {
    await fetch("/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-50"
    >
      Sign out
    </button>
  );
}
