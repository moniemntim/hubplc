import Calculator from '../_calculators/energy-cost';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('energy-cost');
export default function Page() {
  return (
    <ToolPage slug="energy-cost">
      <Calculator />
    </ToolPage>
  );
}
