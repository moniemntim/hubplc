import Calculator from '../_calculators/capacitor-network';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('capacitor-network');
export default function Page() {
  return (
    <ToolPage slug="capacitor-network">
      <Calculator />
    </ToolPage>
  );
}
