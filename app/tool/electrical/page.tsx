import Calculator from '../_calculators/electrical';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('electrical');
export default function Page() {
  return (
    <ToolPage slug="electrical">
      <Calculator />
    </ToolPage>
  );
}
