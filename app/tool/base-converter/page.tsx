import Calculator from '../_calculators/base-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('base-converter');
export default function Page() {
  return (
    <ToolPage slug="base-converter">
      <Calculator />
    </ToolPage>
  );
}
