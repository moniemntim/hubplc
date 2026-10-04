import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('energy-consumption');
export default function Route() {
  return <Page intent="energy-consumption" />;
}
