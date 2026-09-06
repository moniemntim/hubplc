import Calculator from '../_calculators/analog';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('analog');
export default function Page() {
  return (
    <ToolPage slug="analog">
      <Calculator />
    </ToolPage>
  );
}
