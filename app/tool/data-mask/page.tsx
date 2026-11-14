import Calculator from '../_calculators/data-mask';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('data-mask');
export default function Page() {
  return (
    <ToolPage slug="data-mask">
      <Calculator />
    </ToolPage>
  );
}
