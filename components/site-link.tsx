import type { AnchorHTMLAttributes } from 'react';
/** Document navigation for Vinext static exports. The pinned Vinext Link's
 * production RSC prefetch invokes an unavailable runtime export. Native links
 * also ensure each tool loads only its own client modules from static hosting. */
export default function SiteLink({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
