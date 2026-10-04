import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('va-to-kva');
export default function Route() {
  return <Page intent="va-to-kva" />;
}
