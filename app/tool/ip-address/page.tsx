import Calculator from '../_calculators/ip-address';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('ip-address');
export default function Page() {
  return (
    <ToolPage slug="ip-address">
      <Calculator />
    </ToolPage>
  );
}
