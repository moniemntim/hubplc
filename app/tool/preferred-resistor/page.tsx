import Calculator from '../_calculators/preferred-resistor';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('preferred-resistor');
export default function Page() {
  return (
    <ToolPage slug="preferred-resistor">
      <Calculator />
    </ToolPage>
  );
}
