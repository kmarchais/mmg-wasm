/**
 * Emscripten Virtual Filesystem (MEMFS) type definitions
 *
 * This module provides TypeScript types for Emscripten's FS API,
 * which allows reading and writing files in the browser's virtual filesystem.
 */

/**
 * Path analysis result from FS.analyzePath
 */
export interface PathAnalysis {
  exists: boolean;
  path: string;
  name: string;
  object: unknown;
  parentExists: boolean;
  parentPath: string;
  parentObject: unknown;
}

/**
 * Emscripten FS (virtual filesystem) interface
 *
 * Provides methods for file operations in the browser's virtual filesystem.
 * This is a subset of the full Emscripten FS API, focusing on the most
 * commonly used methods for mesh file I/O.
 */
export interface EmscriptenFS {
  /**
   * Write a file to the virtual filesystem.
   * @param path - Path in the virtual filesystem
   * @param data - File contents as Uint8Array or string
   * @param opts - Optional encoding options
   */
  writeFile(
    path: string,
    data: Uint8Array | string,
    opts?: { encoding?: "binary" | "utf8" },
  ): void;

  /**
   * Read a file from the virtual filesystem as binary.
   * @param path - Path in the virtual filesystem
   * @param opts - Must specify encoding: 'binary'
   * @returns File contents as Uint8Array
   */
  readFile(path: string, opts: { encoding: "binary" }): Uint8Array;

  /**
   * Read a file from the virtual filesystem as text.
   * @param path - Path in the virtual filesystem
   * @param opts - Must specify encoding: 'utf8'
   * @returns File contents as string
   */
  readFile(path: string, opts: { encoding: "utf8" }): string;

  /**
   * Read a file from the virtual filesystem.
   * Default is binary encoding.
   * @param path - Path in the virtual filesystem
   * @param opts - Optional encoding options
   * @returns File contents as Uint8Array (default) or string
   */
  readFile(
    path: string,
    opts?: { encoding?: "binary" | "utf8" },
  ): Uint8Array | string;

  /**
   * Delete a file from the virtual filesystem.
   * @param path - Path to the file to delete
   */
  unlink(path: string): void;

  /**
   * Create a directory in the virtual filesystem.
   * @param path - Path to the directory to create
   * @param mode - Optional permission mode (default: 0o777)
   */
  mkdir(path: string, mode?: number): void;

  /**
   * Remove a directory from the virtual filesystem.
   * @param path - Path to the directory to remove
   */
  rmdir(path: string): void;

  /**
   * Analyze a path in the virtual filesystem.
   * @param path - Path to analyze
   * @returns Object containing path analysis information
   */
  analyzePath(path: string): PathAnalysis;

  /**
   * Check if a path exists in the virtual filesystem.
   * @param path - Path to check
   * @returns true if the path exists
   */
  isFile(mode: number): boolean;

  /**
   * Check if a mode indicates a directory.
   * @param mode - Mode to check
   * @returns true if the mode indicates a directory
   */
  isDir(mode: number): boolean;

  /**
   * Read the contents of a directory.
   * @param path - Path to the directory
   * @returns Array of file/directory names
   */
  readdir(path: string): string[];

  /**
   * Rename/move a file or directory.
   * @param oldPath - Current path
   * @param newPath - New path
   */
  rename(oldPath: string, newPath: string): void;

  /**
   * Get file statistics.
   * @param path - Path to the file
   * @returns Object containing file statistics
   */
  stat(path: string): {
    dev: number;
    ino: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    rdev: number;
    size: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    blksize: number;
    blocks: number;
  };
}
