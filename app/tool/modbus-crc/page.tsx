import Calculator from '../_calculators/modbus-crc';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('modbus-crc');
export default function Page() {
  return (
    <ToolPage slug="modbus-crc">
      <Calculator />
    </ToolPage>
  );
}
