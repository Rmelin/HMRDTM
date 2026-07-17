"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  name: string;
  type: string;
  dietType: string | null;
  dietNotes: string | null;
};

export function PersonRow({ person }: { person: Person }) {
  const router = useRouter();
  const [name, setName] = useState(person.name);
  const [type, setType] = useState(person.type);
  const [dietType, setDietType] = useState(person.dietType ?? "");
  const [dietNotes, setDietNotes] = useState(person.dietNotes ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const response = await fetch(`/api/people/${person.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        dietType: dietType || null,
        dietNotes: dietNotes || null
      })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Kunne ikke gemme");
      return;
    }

    router.refresh();
  };

  const remove = async () => {
    const response = await fetch(`/api/people/${person.id}`, {
      method: "DELETE"
    });
    if (response.ok) {
      router.refresh();
    }
  };

  return (
    <div className="list-item">
      <strong>
        {person.name} ({person.type === "partner" ? "Partner" : person.type === "child" ? "Barn" : "Voksen"})
      </strong>
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
          <select value={dietType || "none"} onChange={(event) => setDietType(event.target.value)}>
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
        <button className="button ghost" onClick={save}>
          Gem person
        </button>
        <button className="button ghost" onClick={remove}>
          Slet person
        </button>
      </div>
    </div>
  );
}
