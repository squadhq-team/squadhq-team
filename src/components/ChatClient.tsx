"use client";
/** Team-Chat: lädt neue Nachrichten alle paar Sekunden nach und leert das Eingabefeld nach dem Senden. */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postMessageAction } from "@/app/neuigkeiten/actions";

export function ChatAutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight });
  }, []);
  return null;
}

export function ChatComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  async function send(formData: FormData) {
    if (!formData.get("body")?.toString().trim()) return;
    setBusy(true);
    try {
      await postMessageAction(formData);
      formRef.current?.reset();
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      ref={formRef}
      action={send}
      className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 border-t border-stone-200 bg-white px-4 py-2 md:static md:rounded-2xl md:border md:shadow-sm"
    >
      <div className="mx-auto flex max-w-3xl gap-2">
        <input type="hidden" name="back" value="/chat" />
        <input
          name="body"
          autoComplete="off"
          placeholder="Nachricht an das Team"
          maxLength={2000}
          className="flex-1 rounded-full border border-stone-300 px-4 py-2.5 text-base focus:border-brand-600 focus:outline-none sm:text-sm"
        />
        <button
          disabled={busy}
          className="rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Senden
        </button>
      </div>
    </form>
  );
}
