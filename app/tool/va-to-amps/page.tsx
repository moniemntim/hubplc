import Calculator from '../_calculators/va-to-amps';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('va-to-amps');
export default function Page() {
  return (
    <ToolPage slug="va-to-amps">
      <Calculator />
    </ToolPage>
  );
}
