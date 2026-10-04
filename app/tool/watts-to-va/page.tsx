import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('watts-to-va');
export default function Route() {
  return <Page intent="watts-to-va" />;
}
