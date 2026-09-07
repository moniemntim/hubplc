import Calculator from '../_calculators/hash';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('hash');
export default function Page() {
  return (
    <ToolPage slug="hash">
      <Calculator />
    </ToolPage>
  );
}
