import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import logoUrl from "../components/ui/Gemini_Generated_Image_gehpycgehpycgehp.png?url";

export default function Login() {
  const { login } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const session = await login(email, password);
      nav(session.role === "admin" ? "/dashboard" : "/portal");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <main className="login-shell">
        <section className="login-brand-panel" aria-label="PLUG SOLICITORS">
          <div className="login-brand-frame">
            <img
              className="login-logo"
              src={logoUrl}
              alt="PLUG SOLICITORS — Just in Case"
              width="520"
              height="347"
            />
          </div>
          <div className="login-brand-index" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="login-form-head">
              <div className="login-overline">PLUG SOLICITORS</div>
              <h1>Welcome back</h1>
              <p>Sign in to your account to continue.</p>
            </div>

            <form onSubmit={submit} className="login-form">
              <div className="field login-field">
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="any@example.com"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="field login-field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              {err && (
                <div className="err-text login-error" role="alert">
                  {err}
                </div>
              )}
              <button
                className="btn btn-primary btn-block login-submit"
                disabled={busy}
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
          <div className="login-form-foot">
            Secure access for firm personnel
          </div>
        </section>
      </main>
    </div>
  );
}
