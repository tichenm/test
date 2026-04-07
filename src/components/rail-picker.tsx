import type { RailKey } from "@/lib/diagnostic-engine";
import type { DiagnosticRail } from "@/lib/diagnostic-rails";

type RailPickerProps = {
  rails: DiagnosticRail[];
  defaultRailKey: RailKey;
  action: string | ((formData: FormData) => void | Promise<void>);
};

export function RailPicker({
  rails,
  defaultRailKey,
  action,
}: RailPickerProps) {
  return (
    <form action={action} className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 lg:col-span-2">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="storeName" className="text-sm font-semibold">
              Store or site
            </label>
            <input
              id="storeName"
              name="storeName"
              type="text"
              placeholder="Optional: Store 12, North hub, Shanghai flagship"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm outline-none"
            />
            <p className="muted text-sm leading-6">
              Optional context helps managers cluster repeated issues by location.
            </p>
          </div>

          <div className="grid gap-2">
            <label htmlFor="roleName" className="text-sm font-semibold">
              Role or function
            </label>
            <input
              id="roleName"
              name="roleName"
              type="text"
              placeholder="Optional: Store manager, warehouse supervisor, project lead"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm outline-none"
            />
            <p className="muted text-sm leading-6">
              Optional role context helps managers see which frontline functions surface the same pain.
            </p>
          </div>
        </div>
      </section>

      {rails.map((rail) => {
        const isRecommended = rail.key === defaultRailKey;

        return (
          <section
            key={rail.key}
            className={`rounded-[var(--radius-lg)] border p-5 ${
              isRecommended
                ? "border-[var(--color-accent)] bg-[var(--color-surface-strong)] shadow-[0_18px_44px_rgba(166,85,32,0.12)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-strong)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 className="display-title text-2xl font-semibold">{rail.label}</h2>
                <p className="muted text-sm leading-6">{rail.workbenchSummary}</p>
              </div>
              {isRecommended ? (
                <span className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-foreground)]">
                  Recommended
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--color-text-muted)]">
                7-step guided diagnosis
              </span>
              <button
                type="submit"
                name="railKey"
                value={rail.key}
                aria-label={`Start ${rail.label.toLowerCase()} diagnosis`}
                className={`min-h-11 rounded-[var(--radius-md)] px-4 text-sm font-semibold ${
                  isRecommended
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                Start Diagnosis
              </button>
            </div>
          </section>
        );
      })}
    </form>
  );
}
