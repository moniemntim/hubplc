import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('angle-converter');

export default function Page() {
  return (
    <ToolPage slug="angle-converter">
      <Calculator fixedGroup="angle" />
    </ToolPage>
  );
}
