import { useRef, useEffect, useState } from "preact/hooks";

/**
 * Player page — read-only stack viewer.
 *
 * Loads a stack by ID from the URL and displays it in browse-only mode.
 * Placeholder for now: actual stack fetching will be implemented in Task 5.2.
 */
export function PlayerPage({ id }: { id?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No stack ID provided.");
      setLoading(false);
      return;
    }

    // TODO (Task 5.2): Fetch the stack from the API by ID
    // For now, show a placeholder
    const timer = setTimeout(() => {
      setLoading(false);
      setError("Stack loading will be available when the API is ready.");
    }, 500);

    return () => clearTimeout(timer);
  }, [id]);

  return (
    <div class="wc-player">
      {loading && <p class="wc-player-loading">Loading stack...</p>}
      {error && <p class="wc-player-error">{error}</p>}
      <div ref={containerRef} />
    </div>
  );
}
