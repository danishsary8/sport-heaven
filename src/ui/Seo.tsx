/** Page title and meta tags (React 19 hoists them into <head>). */
export function Seo({ title, description, canonical, image, noindex }: { title: string; description?: string; canonical?: string; image?: string; noindex?: boolean }) {
  const full = title === 'Sport Castle' ? title : `${title} | Sport Castle`;
  return (
    <>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      {noindex && <meta name="robots" content="noindex" />}
    </>
  );
}
