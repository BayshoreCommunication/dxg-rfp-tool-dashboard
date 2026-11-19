// Test-only helpers shared by the step forms' accessibility tests.

/** Every <label for> must point at an element that exists, and every aria-labelledby /
 *  aria-describedby id must resolve; a dangling reference is a silent accessibility bug. */
export function danglingReferences(root: ParentNode = document): string[] {
  const problems: string[] = [];
  root.querySelectorAll("label[for]").forEach((label) => {
    const id = label.getAttribute("for") as string;
    if (!document.getElementById(id)) problems.push(`label[for="${id}"] has no control`);
  });
  for (const attr of ["aria-labelledby", "aria-describedby"]) {
    root.querySelectorAll(`[${attr}]`).forEach((el) => {
      for (const id of (el.getAttribute(attr) as string).split(/\s+/).filter(Boolean)) {
        if (!document.getElementById(id)) problems.push(`${attr}="${id}" does not resolve`);
      }
    });
  }
  return problems;
}

/** Duplicate ids make label association ambiguous. */
export function duplicateIds(root: ParentNode = document): string[] {
  const seen = new Map<string, number>();
  root.querySelectorAll("[id]").forEach((el) => seen.set(el.id, (seen.get(el.id) ?? 0) + 1));
  return [...seen].filter(([, count]) => count > 1).map(([id]) => id);
}

/** A <button> inside a <label> is a second labelled control and pollutes the accessible name. */
export function buttonsInsideLabels(root: ParentNode = document): number {
  return root.querySelectorAll("label button").length;
}
