declare module "mathlive" {
  export class MathfieldElement extends HTMLElement {
    static soundsDirectory: string | null;
    value: string;
    insert(latex: string, options?: Record<string, unknown>): void;
    focus(): void;
  }
}

declare module "mathlive/mathlive.min.mjs" {
  export class MathfieldElement extends HTMLElement {
    static soundsDirectory: string | null;
    value: string;
    insert(latex: string, options?: Record<string, unknown>): void;
    focus(): void;
  }
}
