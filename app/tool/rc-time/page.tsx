import Calculator from '../_calculators/rc-time';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('rc-time');
export default function Page() {
  return (
    <ToolPage slug="rc-time">
      <Calculator />
    </ToolPage>
  );
}
