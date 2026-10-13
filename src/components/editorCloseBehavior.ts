/** Keep the modal close/discard policy separate from presentation and testable in Node. */
export function editorCloseBehavior(dirty: boolean): "confirm" | "close" {
  return dirty ? "confirm" : "close";
}
