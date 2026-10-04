import Page, { powerIntentMetadata } from '../_components/power-intent-page';
export const metadata = powerIntentMetadata('amps-to-kilowatts');
export default function Route() {
  return <Page intent="amps-to-kilowatts" />;
}
