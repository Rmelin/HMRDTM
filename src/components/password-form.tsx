"use client";

import { useState } from "react";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (newPassword !== repeatPassword) return setError("De nye passwords er ikke ens");
    const response = await fetch("/api/account/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Kunne ikke ændre password");
    window.location.href = "/admin/login?password=changed";
  }

  return (
    <div>
      <div className="form-grid">
        <label>Nuværende password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label>Nyt password<input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <label>Gentag nyt password<input type="password" minLength={8} value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} /></label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row"><button className="button" onClick={save}>Skift password</button></div>
    </div>
  );
}
