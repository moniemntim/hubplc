import Calculator from '../_calculators/ac-power-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('ac-power-converter');
export default function Page() {
  return (
    <ToolPage slug="ac-power-converter">
      <Calculator />
    </ToolPage>
  );
}
