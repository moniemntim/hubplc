import Calculator from '../_calculators/date-calculator';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('date-calculator');

export default function Page() {
  return (
    <ToolPage slug="date-calculator">
      <Calculator />
    </ToolPage>
  );
}
