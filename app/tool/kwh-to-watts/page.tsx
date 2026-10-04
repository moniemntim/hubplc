import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('kwh-to-watts');
export default function Route() {
  return <Page intent="kwh-to-watts" />;
}
