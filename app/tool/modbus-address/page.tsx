import Calculator from '../_calculators/modbus-address';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('modbus-address');
export default function Page() {
  return (
    <ToolPage slug="modbus-address">
      <Calculator />
    </ToolPage>
  );
}
