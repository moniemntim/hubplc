import Calculator from '../_calculators/crypto';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('crypto');
export default function Page() {
  return (
    <ToolPage slug="crypto">
      <Calculator />
    </ToolPage>
  );
}
