"use client";

import { useState } from "react";

type Mode = "login" | "setup";

export default function AdminLoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: mode === "setup" ? name : undefined, email, password })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Noget gik galt");
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  };

  return (
    <section className="card">
      <h1>Log ind</h1>
      <p>
        Log ind med din bruger. Første opsætning bruges kun, hvis der endnu
        ikke findes en administrator.
      </p>
      <div className="button-row">
        <button
          className={mode === "login" ? "button" : "button ghost"}
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          className={mode === "setup" ? "button" : "button ghost"}
          onClick={() => setMode("setup")}
        >
          Første admin
        </button>
      </div>
      <div className="form-grid">
        {mode === "setup" ? <label>
          Navn
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rasmus" />
        </label> : null}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@hmrdtm.dk"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row">
        <button className="button" onClick={submit} disabled={loading}>
          {loading ? "Arbejder..." : "Fortsæt"}
        </button>
      </div>
    </section>
  );
}
