import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('va-to-watts');
export default function Route() {
  return <Page intent="va-to-watts" />;
}
