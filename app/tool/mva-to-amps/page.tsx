import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('mva-to-amps');
export default function Route() {
  return <Page intent="mva-to-amps" />;
}
