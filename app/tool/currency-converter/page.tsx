import Calculator from '../_calculators/currency-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('currency-converter');
export default function Page() {
  return (
    <ToolPage slug="currency-converter">
      <Calculator />
    </ToolPage>
  );
}
