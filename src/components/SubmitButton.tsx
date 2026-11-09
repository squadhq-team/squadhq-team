"use client";
/**
 * Formular mit sichtbarem Feedback (UX-Feedback aus P3):
 * - während des Speicherns sind alle Buttons des Formulars ausgegraut und gesperrt (kein Doppelklick)
 * - der angeklickte Button zeigt einen Lade-Kreis, bei Auswahl-Buttons ist er sofort markiert
 * - danach erscheint kurz ein Haken (✓) am Button
 *
 * Verwendung:
 *   <ActionForm action={respondAction}>
 *     <SubmitButton name="status" value="ATTENDING">Dabei</SubmitButton>
 *   </ActionForm>
 */
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type Status = { phase: "idle" | "pending" | "done"; clicked: string | null };

const FormFeedback = createContext<Status>({ phase: "idle", clicked: null });

/** Schlüssel des angeklickten Buttons (name=value), damit nur dieser den Ladezustand zeigt. */
const keyOf = (name?: string | null, value?: string | null) => `${name ?? ""}=${value ?? ""}`;

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>({ phase: "idle", clicked: null });
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return; // Doppelklick ignorieren
    busy.current = true;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(e.currentTarget, submitter);
    const clicked = keyOf(submitter?.name, submitter?.value);
    if (timer.current) clearTimeout(timer.current);
    setStatus({ phase: "pending", clicked });
    try {
      await action(formData);
      setStatus({ phase: "done", clicked });
      timer.current = setTimeout(() => setStatus({ phase: "idle", clicked: null }), 2000);
    } catch (err) {
      setStatus({ phase: "idle", clicked: null });
      throw err;
    } finally {
      busy.current = false;
    }
  }

  return (
    <FormFeedback.Provider value={status}>
      {/* action bleibt gesetzt, damit das Formular auch ohne JavaScript funktioniert */}
      <form action={action} onSubmit={onSubmit} className={className}>
        {children}
      </form>
    </FormFeedback.Provider>
  );
}

type Props = {
  children: ReactNode;
  className?: string;
  /** name/value wie bei einem normalen Button, z. B. name="status" value="ATTENDING" */
  name?: string;
  value?: string;
  /**
   * Nur bei Auswahl-Buttons (Rückmeldung, Anwesenheit): der aktuell gespeicherte Wert.
   * Die gewählte Option ist umrandet, die anderen sind ausgegraut. Nach dem Klick springt
   * die Markierung sofort auf den neuen Button, noch bevor der Server geantwortet hat.
   */
  current?: string | null;
};

export function SubmitButton({ children, className = "", name, value, current }: Props) {
  const { phase, clicked } = useContext(FormFeedback);
  const isMine = clicked === keyOf(name, value);
  const pending = phase === "pending";

  // Auswahl während/kurz nach dem Speichern: der angeklickte Button gilt schon als gewählt
  const choiceGroup = current !== undefined;
  const clickedInGroup = clicked?.startsWith(`${name ?? ""}=`) ?? false;
  const selected = phase !== "idle" && clickedInGroup ? isMine : current === value;
  const anySelected = (phase !== "idle" && clickedInGroup) || Boolean(current);

  let look = "";
  if (choiceGroup && anySelected)
    look = selected ? "ring-2 ring-offset-2 ring-gray-900 font-semibold" : "opacity-40 hover:opacity-80";
  else if (pending && !isMine) look = "opacity-50";

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending && isMine}
      aria-pressed={choiceGroup ? selected : undefined}
      className={`inline-flex items-center justify-center gap-1.5 transition active:scale-95 disabled:cursor-wait ${className} ${look}`}
    >
      {pending && isMine ? <Spinner /> : phase === "done" && isMine ? <span aria-hidden>✓</span> : null}
      {children}
      {pending && isMine && <span className="sr-only">wird gespeichert</span>}
      {phase === "done" && isMine && <span className="sr-only">gespeichert</span>}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
