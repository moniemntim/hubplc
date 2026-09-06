import Calculator from '../_calculators/shunt-resistor';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('shunt-resistor');
export default function Page() {
  return (
    <ToolPage slug="shunt-resistor">
      <Calculator />
    </ToolPage>
  );
}
