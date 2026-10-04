import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('amps-to-watts');
export default function Route() {
  return <Page intent="amps-to-watts" />;
}
