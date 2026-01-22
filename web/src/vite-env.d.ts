/// <reference types="vite/client" />

declare module "*.js" {
  const createModule: () => Promise<unknown>;
  export default createModule;
}
