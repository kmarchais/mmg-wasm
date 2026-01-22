import { useMeshStore } from "@/stores/meshStore";

export function StatusBar() {
  const { wasmStatus, statusMessage, isRemeshing } = useMeshStore();

  const getStatusBadgeClass = () => {
    if (isRemeshing) return "status-badge loading";
    switch (wasmStatus) {
      case "loading":
        return "status-badge loading";
      case "ready":
        return "status-badge ready";
      case "error":
        return "status-badge error";
      default:
        return "status-badge";
    }
  };

  const getStatusText = () => {
    if (isRemeshing) return "Remeshing...";
    switch (wasmStatus) {
      case "loading":
        return "Loading WASM module...";
      case "ready":
        return statusMessage?.message ?? "Ready";
      case "error":
        return statusMessage?.message ?? "Error loading module";
      default:
        return "Initializing...";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-2">
      <div className="flex items-center justify-between">
        <span className={getStatusBadgeClass()}>
          {(wasmStatus === "loading" || isRemeshing) && (
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {wasmStatus === "ready" && !isRemeshing && (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {wasmStatus === "error" && (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          {getStatusText()}
        </span>
      </div>
    </div>
  );
}
