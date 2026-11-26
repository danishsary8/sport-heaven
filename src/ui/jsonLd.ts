/**
 * JSON for a `<script type="application/ld+json">` tag. `<`, `>` and `&` are written as Unicode escapes,
 * so a product name like `</script><script>…` stays data if the page is ever server-rendered or prerendered.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
