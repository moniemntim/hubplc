import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('electricity-cost');
export default function Route() {
  return <Page intent="electricity-cost" />;
}
