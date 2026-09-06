import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('unit-converter');
export default function Page() {
  return (
    <ToolPage slug="unit-converter">
      <Calculator />
    </ToolPage>
  );
}
