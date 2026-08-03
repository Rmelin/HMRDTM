"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseGuestImport } from "@/lib/guest-import";

export function GuestGroupForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const preview = useMemo(() => parseGuestImport(importText), [importText]);

  const submit = async () => {
    setError(null);
    const response = await fetch(`/api/events/${eventId}/guest-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Kunne ikke oprette gæstegruppe");
      return;
    }

    setDisplayName("");
    router.refresh();
  };

  const importGuests = async () => {
    if (preview.errors.length > 0 || preview.guests.length === 0) return;
    setImporting(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const response = await fetch(`/api/events/${eventId}/guest-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importText })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const details = Array.isArray(payload?.errors)
          ? ` ${payload.errors.join(" ")}`
          : "";
        setImportError(
          `${payload?.error ?? "Kunne ikke importere gæster."}${details}`
        );
        return;
      }

      setImportMessage(
        `${payload.count} invitation${payload.count === 1 ? "" : "er"} blev oprettet.`
      );
      setImportText("");
      router.refresh();
    } catch {
      setImportError("Der kunne ikke oprettes forbindelse til serveren.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <h3>Opret gæst / invitation</h3>
      <div className="form-grid">
        <label>
          Navn (kan udfyldes senere)
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row">
        <button className="button" type="button" onClick={submit}>
          Opret og generér link
        </button>
      </div>
      <details className="section" style={{ marginTop: 18 }}>
        <summary className="section-title">Importér flere gæster</summary>
        <div className="section-body">
          <p className="helper-text">
            Indsæt CSV eller tekst med én hovedgæst pr. linje. Første kolonne er
            navn, anden kolonne er valgfrit telefonnummer. Indryk et barn under
            hovedgæsten, eller tilføj barnet i en ekstra kolonne.
          </p>
          <textarea
            rows={9}
            maxLength={50_000}
            value={importText}
            onChange={(event) => {
              setImportText(event.target.value);
              setImportError(null);
              setImportMessage(null);
            }}
            placeholder={`Navn, Telefon
Anna, +45 12 34 56 78
  Alma
Bo`}
          />

          {importText.trim() ? (
            <div style={{ marginTop: 16 }}>
              <div className="item-heading">
                <div>
                  <span className="eyebrow">Forhåndsvisning</span>
                  <h3>{preview.guests.length} invitationer</h3>
                </div>
                <span className={`badge ${preview.errors.length ? "warning" : "accent"}`}>
                  {preview.errors.length ? `${preview.errors.length} fejl` : "Klar til import"}
                </span>
              </div>

              {preview.errors.length > 0 ? (
                <div className="alert" style={{ marginTop: 12 }}>
                  <div>
                    {preview.errors.map((message) => (
                      <div key={message}>{message}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="list" style={{ marginTop: 12 }}>
                  {preview.guests.map((guest) => (
                    <div className="list-item" key={`${guest.line}:${guest.displayName}`}>
                      <div className="item-heading">
                        <strong>{guest.displayName}</strong>
                        <span className="badge">
                          {guest.children.length} {guest.children.length === 1 ? "barn" : "børn"}
                        </span>
                      </div>
                      <div className="muted">
                        {guest.contactPhone || "Intet telefonnummer"}
                        {guest.children.length > 0
                          ? ` · Børn: ${guest.children.join(", ")}`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {importError ? <p className="error">{importError}</p> : null}
          {importMessage ? <p className="success">{importMessage}</p> : null}
          <div className="button-row">
            <button
              className="button"
              type="button"
              disabled={
                importing ||
                preview.guests.length === 0 ||
                preview.errors.length > 0
              }
              onClick={importGuests}
            >
              {importing
                ? "Importerer…"
                : `Importér ${preview.guests.length || ""} invitationer`.trim()}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
