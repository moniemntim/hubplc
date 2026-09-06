import Calculator from '../_calculators/lc-resonance';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('lc-resonance');
export default function Page() {
  return (
    <ToolPage slug="lc-resonance">
      <Calculator />
    </ToolPage>
  );
}
