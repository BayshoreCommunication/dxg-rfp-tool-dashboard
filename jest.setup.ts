import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream } from "node:stream/web";

// Feature gates default to on under test so suites exercise real behaviour; a
// test that cares about a closed gate sets the flag itself.
process.env.NEXT_PUBLIC_CONVERSATION_EXTRACTION_ENABLED = 'true'

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
