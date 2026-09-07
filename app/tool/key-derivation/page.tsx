import Calculator from '../_calculators/key-derivation';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('key-derivation');
export default function Page() {
  return (
    <ToolPage slug="key-derivation">
      <Calculator />
    </ToolPage>
  );
}
