import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('speed-converter');

export default function Page() {
  return (
    <ToolPage slug="speed-converter">
      <Calculator fixedGroup="speed" />
    </ToolPage>
  );
}
