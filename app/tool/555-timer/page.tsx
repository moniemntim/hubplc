import Calculator from '../_calculators/555-timer';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('555-timer');
export default function Page() {
  return (
    <ToolPage slug="555-timer">
      <Calculator />
    </ToolPage>
  );
}
