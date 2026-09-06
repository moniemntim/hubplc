import Calculator from '../_calculators/smd-capacitor';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('smd-capacitor');
export default function Page() {
  return (
    <ToolPage slug="smd-capacitor">
      <Calculator />
    </ToolPage>
  );
}
