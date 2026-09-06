import Calculator from '../_calculators/register-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('register-converter');
export default function Page() {
  return (
    <ToolPage slug="register-converter">
      <Calculator />
    </ToolPage>
  );
}
