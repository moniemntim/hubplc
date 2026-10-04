import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('kw-to-volts');
export default function Route() {
  return <Page intent="kw-to-volts" />;
}
