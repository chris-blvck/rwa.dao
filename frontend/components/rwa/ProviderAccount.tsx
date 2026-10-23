"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/rwa/supabase";
import { providerAccount, signInProviderAccount, signOutProviderAccount, type ProviderAccount as Account } from "@/lib/rwa/provider_session";

/** Existing accounts only. Account creation and spending allowances are operator managed. */
export function ProviderAccount() {
  const [configured, setConfigured] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setConfigured(isSupabaseConfigured());
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let active = true;
    let changed = false;
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (active) setAccount(providerAccount(session));
    });
    void sb.auth.getSession().then(({ data }) => {
      if (active && !changed) setAccount(providerAccount(data.session));
    }).catch(() => {});
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  if (!configured) return null;
  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try { await signInProviderAccount(email, password); setPassword(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    setBusy(true); setMessage("");
    try { await signOutProviderAccount(); setAccount(null); setPassword(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not sign out."); }
    finally { setBusy(false); }
  };
  return (
    <section className="border-b border-line bg-bg2" aria-label="Creator account">
      <div className="mx-auto max-w-6xl px-5 py-3 sm:px-8">
        {account ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Creator account: {account.email}</span>
            <Button size="md" variant="secondary" onClick={signOut} disabled={busy}>Sign out</Button>
            <span className="text-xs text-fgMuted">Live generation uses your assigned allowance.</span>
          </div>
        ) : (
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Sign in for live generation</summary>
            <form onSubmit={signIn} className="mt-3 flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-xs">Email
                <input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} className="rounded border border-line bg-bg px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs">Password
                <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={1024} className="rounded border border-line bg-bg px-3 py-2 text-sm" />
              </label>
              <Button type="submit" size="md" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
              <p className="w-full text-xs text-fgMuted">Use an existing creator account. Contact the operator for access and a generation allowance.</p>
            </form>
          </details>
        )}
        {message ? <p role="alert" className="mt-2 text-sm text-fg">{message}</p> : null}
      </div>
    </section>
  );
}
