import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('volts-to-amps');
export default function Route() {
  return <Page intent="volts-to-amps" />;
}
