import Calculator from '../_calculators/byte-encoding';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('byte-encoding');

export default function Page() {
  return (
    <ToolPage slug="byte-encoding">
      <Calculator />
    </ToolPage>
  );
}
