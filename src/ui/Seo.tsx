/** Page title and meta tags (React 19 hoists them into <head>). */
export function Seo({ title, description, canonical, image, noindex }: { title: string; description?: string; canonical?: string; image?: string; noindex?: boolean }) {
  const full = title === 'Sport Heaven' ? title : `${title} | Sport Heaven`;
  // Search engines need absolute URLs for canonical and social images.
  const abs = (u?: string) => (u && u.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${u}` : u);
  return (
    <>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={abs(canonical)} />}
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={abs(image)} />}
      {noindex && <meta name="robots" content="noindex" />}
    </>
  );
}
