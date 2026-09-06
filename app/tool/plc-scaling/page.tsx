import Calculator from '../_calculators/plc-scaling';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('plc-scaling');
export default function Page() {
  return (
    <ToolPage slug="plc-scaling">
      <Calculator />
    </ToolPage>
  );
}
