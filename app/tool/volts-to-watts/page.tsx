import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('volts-to-watts');
export default function Route() {
  return <Page intent="volts-to-watts" />;
}
