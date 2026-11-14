import Calculator from '../_calculators/sample-data';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('random-codes');

export default function Page() {
  return (
    <ToolPage slug="random-codes">
      <Calculator kind="random-codes" />
    </ToolPage>
  );
}
