/// <reference types="vite/client" />

declare module "*.tsx" {
  import type { ComponentType } from "react";
  const Component: ComponentType<unknown>;
  export default Component;
}
