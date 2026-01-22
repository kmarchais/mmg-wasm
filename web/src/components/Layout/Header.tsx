import { useMeshStore } from "@/stores/meshStore";
import type { MeshType } from "@/types/mesh";
import { useCallback, useRef } from "react";

const tabs: { id: MeshType; label: string; description: string }[] = [
  { id: "mmg2d", label: "2D (MMG2D)", description: "2D triangular mesh" },
  { id: "mmgs", label: "Surface (MMGS)", description: "3D surface mesh" },
  { id: "mmg3d", label: "3D (MMG3D)", description: "3D tetrahedral mesh" },
];

interface HeaderProps {
  onFileLoad?: (file: File) => Promise<void>;
  onExport?: () => void;
  disabled?: boolean;
}

export function Header({ onFileLoad, onExport, disabled }: HeaderProps) {
  const { theme, toggleTheme, activeMeshType, setActiveMeshType } =
    useMeshStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileLoad) {
        await onFileLoad(file);
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFileLoad],
  );

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-2">
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            mmg-wasm
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            WebAssembly bindings for the MMG mesh adaptation library
          </p>
        </div>

        {/* Tabs in the center */}
        <nav className="flex gap-1" aria-label="Mesh type tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMeshType(tab.id)}
              className={`tab-button ${activeMeshType === tab.id ? "active" : ""}`}
              aria-selected={activeMeshType === tab.id}
              role="tab"
            >
              <span className="block">{tab.label}</span>
              <span className="block text-xs font-normal opacity-70">
                {tab.description}
              </span>
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* File I/O */}
          <input
            ref={inputRef}
            type="file"
            accept=".mesh,.meshb"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Import mesh (.mesh/.meshb)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
          <button
            onClick={onExport}
            disabled={disabled}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Export mesh"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
          >
            {theme === "light" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            )}
          </button>

          {/* GitHub link */}
          <a
            href="https://github.com/kmarchais/mmg-wasm"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="GitHub repository"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
