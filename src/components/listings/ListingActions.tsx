"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Share2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ContactSellerButton({
  listingId,
  isLoggedIn,
  disabled,
}: {
  listingId: string;
  isLoggedIn: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, message }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Správu sa nepodarilo odoslať.");
        setStatus("error");
        return;
      }
      setStatus("sent");
      router.push(`/profil/spravy${data.conversationId ? `?konverzacia=${data.conversationId}` : ""}`);
    } catch {
      setError("Správu sa nepodarilo odoslať.");
      setStatus("error");
    }
  }

  if (disabled) {
    return (
      <Button variant="outline" size="md" className="w-full" disabled>
        <MessageSquare className="h-4 w-4" />
        Napísať predávajúcemu
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button variant="primary" size="md" className="w-full" onClick={() => router.push("/prihlasenie")}>
        <MessageSquare className="h-4 w-4" />
        Prihláste sa a napíšte predávajúcemu
      </Button>
    );
  }

  if (status === "sent") {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        Správa bola odoslaná. Prebieha presmerovanie do správ…
      </p>
    );
  }

  if (open) {
    return (
      <div className="space-y-2">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          placeholder="Dobrý deň, je tovar stále dostupný?"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            disabled={message.trim().length < 2 || status === "sending"}
            onClick={send}
          >
            {status === "sending" ? "Odosielam…" : "Odoslať správu"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Zrušiť
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="primary" size="md" className="w-full" onClick={() => setOpen(true)}>
      <MessageSquare className="h-4 w-4" />
      Napísať predávajúcemu
    </Button>
  );
}

export function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const absolute = `${window.location.origin}${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: absolute });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button variant="outline" size="md" className="w-full" onClick={share}>
      <Share2 className="h-4 w-4" />
      {copied ? "Odkaz skopírovaný" : "Zdieľať"}
    </Button>
  );
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam alebo reklama" },
  { value: "nevhodny_obsah", label: "Nevhodný obsah" },
  { value: "podvod", label: "Podozrenie na podvod" },
  { value: "duplicitny", label: "Duplicitný inzerát" },
  { value: "iny", label: "Iný dôvod" },
] as const;

export function ReportButton({
  listingId,
  externalListingId,
}: {
  listingId?: string;
  externalListingId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(listingId ? { listingId } : { externalListingId }),
          reason,
          ...(details.trim() ? { details: details.trim() } : {}),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Nahlásenie sa nepodarilo odoslať.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Nahlásenie sa nepodarilo odoslať.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        Ďakujeme, inzerát bol nahlásený moderátorom.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="ghost" size="md" className="w-full" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" />
        Nahlásiť inzerát
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-ink-200 p-3">
      <p className="text-sm font-semibold text-ink-900">Dôvod nahlásenia</p>
      <select
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
      >
        {REPORT_REASONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        rows={3}
        placeholder="Podrobnosti (nepovinné)"
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button variant="danger" size="sm" className="flex-1" disabled={status === "sending"} onClick={submit}>
          {status === "sending" ? "Odosielam…" : "Odoslať nahlásenie"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Zrušiť
        </Button>
      </div>
    </div>
  );
}
