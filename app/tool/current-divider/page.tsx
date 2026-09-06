import Calculator from '../_calculators/current-divider';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('current-divider');
export default function Page() {
  return (
    <ToolPage slug="current-divider">
      <Calculator />
    </ToolPage>
  );
}
