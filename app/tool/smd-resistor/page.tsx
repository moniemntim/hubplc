import Calculator from '../_calculators/smd-resistor';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('smd-resistor');
export default function Page() {
  return (
    <ToolPage slug="smd-resistor">
      <Calculator />
    </ToolPage>
  );
}
