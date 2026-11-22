// Any route without its own modal clears the slot, so a settings dialog never lingers.
export default function CatchAll() {
  return null;
}
