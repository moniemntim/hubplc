import Calculator from '../_calculators/rc-filter';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('rc-filter');
export default function Page() {
  return (
    <ToolPage slug="rc-filter">
      <Calculator />
    </ToolPage>
  );
}
