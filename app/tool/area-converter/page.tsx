import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('area-converter');

export default function Page() {
  return (
    <ToolPage slug="area-converter">
      <Calculator fixedGroup="area" />
    </ToolPage>
  );
}
