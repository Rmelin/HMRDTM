"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PersonForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("adult");
  const [dietType, setDietType] = useState("none");
  const [dietNotes, setDietNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const response = await fetch(`/api/guest-groups/${groupId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        dietType: dietType || undefined,
        dietNotes: dietNotes || undefined
      })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Kunne ikke oprette person");
      return;
    }

    setName("");
    setType("adult");
    setDietType("none");
    setDietNotes("");
    router.refresh();
  };

  return (
    <div>
      <div className="form-grid">
        <label>
          Navn
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Type
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="adult">Voksen</option>
            <option value="partner">Partner</option>
            <option value="child">Barn</option>
          </select>
        </label>
        <label>
          Kosttype
          <select value={dietType} onChange={(event) => setDietType(event.target.value)}>
            <option value="none">Ingen</option><option value="vegetarian">Vegetar</option><option value="vegan">Veganer</option><option value="allergy">Allergi</option><option value="other">Andet</option>
          </select>
        </label>
        <label>
          Kostnoter
          <textarea
            rows={2}
            value={dietNotes}
            onChange={(event) => setDietNotes(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row">
        <button className="button ghost" onClick={submit}>
          Tilføj person
        </button>
      </div>
    </div>
  );
}
