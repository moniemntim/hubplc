import Calculator from '../_calculators/capacitor-discharge';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('capacitor-discharge');
export default function Page() {
  return (
    <ToolPage slug="capacitor-discharge">
      <Calculator />
    </ToolPage>
  );
}
