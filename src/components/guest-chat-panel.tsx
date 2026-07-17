"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChatMessage = {
  id: string;
  message: string;
  createdAt: number;
  authorName: string | null;
};

export function GuestChatPanel({
  token,
  messages
}: {
  token: string;
  messages: ChatMessage[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    if (!message.trim()) return;
    const response = await fetch(`/api/guest/${token}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Kunne ikke sende");
      return;
    }

    setMessage("");
    router.refresh();
  };

  return (
    <div>
      <div className="form-grid">
        <label>
          Ny besked
          <textarea
            rows={2}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row">
        <button className="button" onClick={send}>
          Send
        </button>
      </div>
      <div className="list">
        {messages.length === 0 ? (
          <div className="list-item">Ingen beskeder endnu.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="list-item">
              <strong>{msg.authorName ?? "Admin"}</strong>
              <div>{new Date(msg.createdAt).toLocaleString("da-DK")}</div>
              <div>{msg.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
