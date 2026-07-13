import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  type?: string;
  structuredData?: Record<string, any>;
}

export function SEO({ 
  title, 
  description, 
  canonicalPath, 
  ogImage = '/new-icon.svg', 
  type = 'website',
  structuredData 
}: SEOProps) {
  const location = useLocation();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://lexipaws.eu';
  const canonicalUrl = canonicalPath ? `${currentOrigin}${canonicalPath}` : `${currentOrigin}${location.pathname}`;
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${currentOrigin}${ogImage}`;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
