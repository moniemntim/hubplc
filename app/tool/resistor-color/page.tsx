import Calculator from '../_calculators/resistor-color';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('resistor-color');
export default function Page() {
  return (
    <ToolPage slug="resistor-color">
      <Calculator />
    </ToolPage>
  );
}
