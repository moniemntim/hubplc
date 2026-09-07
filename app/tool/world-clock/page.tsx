import Calculator from '../_calculators/world-clock';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('world-clock');
export default function Page() {
  return (
    <ToolPage slug="world-clock">
      <Calculator />
    </ToolPage>
  );
}
