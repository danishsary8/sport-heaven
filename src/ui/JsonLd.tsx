import { serializeJsonLd } from './jsonLd';

/** Structured data for search engines (schema.org), serialised so page content can never close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}
