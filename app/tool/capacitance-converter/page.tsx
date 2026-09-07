import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('capacitance-converter');

export default function Page() {
  return (
    <ToolPage slug="capacitance-converter">
      <Calculator fixedGroup="capacitance" />
    </ToolPage>
  );
}
