import Calculator from '../_calculators/power-factor';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('power-factor');
export default function Page() {
  return (
    <ToolPage slug="power-factor">
      <Calculator />
    </ToolPage>
  );
}
