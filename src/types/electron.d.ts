export {};

declare global {
  interface Window {
    electronAPI?: {
      selectDirectory: (defaultPath?: string) => Promise<string | null>;
      saveFile: (filePath: string, data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      getDesktopPath: () => Promise<string>;
      setFullScreen: (flag: boolean) => Promise<boolean>;
      isFullScreen: () => Promise<boolean>;
      onFullScreenChange: (callback: (isFullScreen: boolean) => void) => void;
    };
  }
}
