export function isDemoPage(
  search: string = typeof window === "undefined" ? "" : window.location.search,
  hash: string = typeof window === "undefined" ? "" : window.location.hash,
): boolean {
  const params = new URLSearchParams(search);
  if (params.has("demo") || params.get("pagina") === "teste") return true;
  return hash === "#teste" || hash === "#demo";
}
