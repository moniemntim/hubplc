import Calculator from '../_calculators/led-resistor';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('led-resistor');
export default function Page() {
  return (
    <ToolPage slug="led-resistor">
      <Calculator />
    </ToolPage>
  );
}
