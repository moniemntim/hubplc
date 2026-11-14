import Calculator from '../_calculators/email-check';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('email-check');
export default function Page() {
  return (
    <ToolPage slug="email-check">
      <Calculator />
    </ToolPage>
  );
}
