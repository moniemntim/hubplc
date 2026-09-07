import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('pressure-converter');

export default function Page() {
  return (
    <ToolPage slug="pressure-converter">
      <Calculator fixedGroup="pressure" />
    </ToolPage>
  );
}
