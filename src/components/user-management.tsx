"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string; email: string; role: string };

function UserRow({
  user,
  currentUserId,
  onDelete,
  onSaved
}: {
  user: User;
  currentUserId: string;
  onDelete: (user: User) => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.name);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveName() {
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Navnet kunne ikke gemmes");
        return;
      }
      setDisplayName(result.name);
      setMessage("Det viste navn er gemt");
      onSaved();
    } catch {
      setMessage("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="list-item user-list-item">
      <div className="item-heading">
        <div><strong>{user.name || user.email}</strong><div className="muted">{user.email}</div></div>
        <span className="badge">{user.role === "admin" ? "Administrator" : "Bruger"}</span>
      </div>
      <div className="user-name-editor">
        <label>
          <span className="field-label">Vist navn</span>
          <input
            value={displayName}
            maxLength={80}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setMessage(null);
            }}
          />
        </label>
        <button
          className="button ghost"
          disabled={saving || !displayName.trim() || displayName.trim() === user.name}
          onClick={saveName}
        >
          {saving ? "Gemmer…" : "Gem navn"}
        </button>
      </div>
      {message ? <p className={message.includes("gemt") ? "success" : "error"}>{message}</p> : null}
      {user.role !== "admin" && user.id !== currentUserId ? (
        <button className="button danger" onClick={() => onDelete(user)}>Slet bruger</button>
      ) : null}
    </div>
  );
}

export function UserManagement({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createUser() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Serveren kunne ikke oprette brugeren");
        return;
      }
      setName(""); setEmail(""); setPassword("");
      router.refresh();
    } catch {
      setError("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Slet ${user.name || user.email}? Brugeren mister adgang til sine events.`)) return;
    setError(null);
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Kunne ikke slette bruger");
    router.refresh();
  }

  return (
    <div>
      <div className="form-grid">
        <label>Navn<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Kasper" /></label>
        <label>Mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="kasper@example.dk" /></label>
        <label>Midlertidigt password<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row"><button className="button" disabled={saving} onClick={createUser}>{saving ? "Opretter…" : "Opret bruger"}</button></div>
      <div className="list">
        {users.map((user) => <UserRow key={user.id} user={user} currentUserId={currentUserId} onDelete={deleteUser} onSaved={() => router.refresh()} />)}
      </div>
    </div>
  );
}
