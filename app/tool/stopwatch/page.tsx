import Calculator from '../_calculators/stopwatch';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('stopwatch');
export default function Page() {
  return (
    <ToolPage slug="stopwatch">
      <Calculator />
    </ToolPage>
  );
}
