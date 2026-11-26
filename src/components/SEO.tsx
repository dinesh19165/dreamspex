import { Helmet } from 'react-helmet-async';
import { HERO_IMAGE_URL } from '../config/siteMedia';

const SITE_URL = 'https://www.dreamspex.in';

type SEOProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  robots?: string;
  structuredData?: Record<string, unknown>;
};

export default function SEO({
  title,
  description,
  canonicalPath = '/',
  image = HERO_IMAGE_URL,
  robots = 'index,follow',
  structuredData,
}: SEOProps) {
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const imageUrl = image ? new URL(image, SITE_URL).toString() : undefined;
  const structuredDataJson = structuredData
    ? JSON.stringify(structuredData).replace(/</g, '\\u003c')
    : undefined;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robots} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="DreamSpex" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}
      {structuredDataJson ? <script type="application/ld+json">{structuredDataJson}</script> : null}
    </Helmet>
  );
}
