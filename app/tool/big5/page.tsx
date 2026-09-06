import Calculator from '../_calculators/big5';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('big5');
export default function Page() {
  return (
    <ToolPage slug="big5">
      <Calculator />
    </ToolPage>
  );
}
