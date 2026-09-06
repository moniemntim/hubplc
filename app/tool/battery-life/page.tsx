import Calculator from '../_calculators/battery-life';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('battery-life');
export default function Page() {
  return (
    <ToolPage slug="battery-life">
      <Calculator />
    </ToolPage>
  );
}
