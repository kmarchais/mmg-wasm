import type { MeshData, MeshType } from "@/types/mesh";
import { useCallback, useRef } from "react";

interface FileControlsProps {
  meshType: MeshType;
  onFileLoad: (file: File) => Promise<void>;
  onExport: (filename: string) => Promise<void>;
  meshData: MeshData | null;
  disabled?: boolean;
}

export function FileControls({
  meshType,
  onFileLoad,
  onExport,
  meshData,
  disabled,
}: FileControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onFileLoad(file);
      }
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFileLoad],
  );

  const handleExport = useCallback(() => {
    const ext = ".mesh";
    const prefix =
      meshType === "mmg2d"
        ? "mesh2d"
        : meshType === "mmgs"
          ? "surface"
          : "mesh3d";
    const filename = `${prefix}_remeshed${ext}`;
    onExport(filename);
  }, [meshType, onExport]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        await onFileLoad(file);
      }
    },
    [onFileLoad],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="panel">
      <h2 className="panel-header">File I/O</h2>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors"
      >
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
          className="btn btn-secondary w-full"
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
          Import Mesh
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Drag & drop or click to import .mesh/.meshb files
        </p>
      </div>

      <button
        onClick={handleExport}
        disabled={disabled || !meshData}
        className="btn btn-secondary w-full mt-3"
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
        Export Mesh
      </button>
    </div>
  );
}
