import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('watts-to-volts');
export default function Route() {
  return <Page intent="watts-to-volts" />;
}
