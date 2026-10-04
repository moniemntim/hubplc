import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('kva-to-amps');
export default function Route() {
  return <Page intent="kva-to-amps" />;
}
