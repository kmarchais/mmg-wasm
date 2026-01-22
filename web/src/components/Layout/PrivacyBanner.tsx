import { useState } from "react";

export function PrivacyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="privacy-banner mx-6 mt-4">
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <div className="flex-1">
        <strong>Your data stays private.</strong> All mesh computations run
        entirely in your browser using WebAssembly. Your mesh files are never
        uploaded to any server.
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
      >
        Dismiss
      </button>
    </div>
  );
}
