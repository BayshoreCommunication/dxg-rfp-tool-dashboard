/* What kind of request the browser is making, read from its headers. Used
   where a response must only be given to a request that will show it: the
   organization-blocked exit removes the session cookie, and its message
   exists only as the page that request ends on. */

type HeaderReader = Pick<Headers, "get" | "has">;

/* A speculative load: a Next.js <Link> prefetch (router-reducer and segment
   cache prefetches both send one of these, next/dist/client/components/
   app-router-headers.js) or a browser prefetch / prerender. Its response is
   kept aside or thrown away, never shown as the answer to a click. */
export const isPrefetchRequest = (headers: HeaderReader): boolean =>
  headers.has("next-router-prefetch") ||
  headers.has("next-router-segment-prefetch") ||
  /prefetch|prerender/i.test(
    `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`,
  );

/* The browser is loading a page into the tab: an address-bar load, a reload,
   a plain link or a form post. Not a fetch, not a router (RSC) request, not a
   prefetch. Every current browser sends Sec-Fetch-Mode; without it, fall back
   to a GET that asks for HTML. */
export const isDocumentNavigation = (
  method: string,
  headers: HeaderReader,
): boolean => {
  if (headers.has("rsc") || isPrefetchRequest(headers)) return false;
  const mode = headers.get("sec-fetch-mode");
  if (mode !== null) {
    return (
      mode === "navigate" &&
      (headers.get("sec-fetch-dest") ?? "document") === "document"
    );
  }
  return (
    (method === "GET" || method === "HEAD") &&
    (headers.get("accept") ?? "").includes("text/html")
  );
};
