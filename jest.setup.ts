import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream } from "node:stream/web";

Object.defineProperty(globalThis, "TextEncoder", {
  configurable: true,
  value: TextEncoder,
});
Object.defineProperty(globalThis, "TextDecoder", {
  configurable: true,
  value: TextDecoder,
});
Object.defineProperty(globalThis, "ReadableStream", {
  configurable: true,
  value: ReadableStream,
});
