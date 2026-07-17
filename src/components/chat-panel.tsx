"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChatMessage = {
  id: string;
  message: string;
  createdAt: number;
  authorName: string | null;
};

export function ChatPanel({
  eventId,
  messages
}: {
  eventId: string;
  messages: ChatMessage[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    if (!message.trim()) return;
    const response = await fetch(`/api/events/${eventId}/chat`, {
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
    <div className="chat-panel">
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
      <div className="chat-message-list" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-message">Ingen beskeder endnu.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="chat-message">
              <div className="item-heading"><strong>{msg.authorName ?? "Admin"}</strong><time>{new Date(msg.createdAt).toLocaleString("da-DK")}</time></div>
              <div>{msg.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
