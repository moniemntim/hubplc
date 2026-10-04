import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('kwh-to-kw');
export default function Route() {
  return <Page intent="kwh-to-kw" />;
}
