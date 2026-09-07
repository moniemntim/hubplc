import Calculator from '../_calculators/password-generator';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('password-generator');
export default function Page() {
  return (
    <ToolPage slug="password-generator">
      <Calculator />
    </ToolPage>
  );
}
