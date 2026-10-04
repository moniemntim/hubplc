import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('kva-to-kw');
export default function Route() {
  return <Page intent="kva-to-kw" />;
}
