/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

// Build timestamp injected by vite.config.ts. Surfaced in Settings so users
// can verify which version their PWA is actually running.
declare const __APP_BUILD__: string;
