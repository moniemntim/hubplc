import Calculator from '../_calculators/random-tasks';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('gift-exchange');
export default function Page() {
  return (
    <ToolPage slug="gift-exchange">
      <Calculator kind="gift-exchange" />
    </ToolPage>
  );
}
