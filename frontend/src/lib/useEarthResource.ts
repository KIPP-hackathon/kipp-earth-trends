import { useEffect, useState } from "react";

export function useEarthResource<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    attempt: number;
    data?: T;
    error?: string;
  }>({ key: "", attempt: -1 });
  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, attempt, data });
      },
      (error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            key,
            attempt,
            data: previous.key === key ? previous.data : undefined,
            error:
              error instanceof Error
                ? error.message
                : "Falha ao consultar dados.",
          }));
      },
    );
    return () => controller.abort();
    // The key contains every selection parameter; inline loaders do not restart a request on camera movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  const current =
    key !== null && state.key === key && state.attempt === attempt;
  return {
    data: key !== null && state.key === key ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: key !== null && !current,
    retry: () => setAttempt((value) => value + 1),
  };
}
