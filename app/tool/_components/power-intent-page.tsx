import PowerIntentCalculator, {
  type PowerIntent,
} from '../_calculators/power-intent';
import ToolPage, { toolMetadata } from './tool-page';

export const powerIntentMetadata = (intent: PowerIntent) =>
  toolMetadata(intent);
export default function PowerIntentPage({ intent }: { intent: PowerIntent }) {
  return (
    <ToolPage slug={intent}>
      <PowerIntentCalculator intent={intent} />
    </ToolPage>
  );
}
