import Calculator from '../_calculators/resistor-network';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('resistor-network');
export default function Page() {
  return (
    <ToolPage slug="resistor-network">
      <Calculator />
    </ToolPage>
  );
}
