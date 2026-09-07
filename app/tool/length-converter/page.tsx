import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('length-converter');

export default function Page() {
  return (
    <ToolPage slug="length-converter">
      <Calculator fixedGroup="length" />
    </ToolPage>
  );
}
