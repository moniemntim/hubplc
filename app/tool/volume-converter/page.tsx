import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('volume-converter');

export default function Page() {
  return (
    <ToolPage slug="volume-converter">
      <Calculator fixedGroup="volume" />
    </ToolPage>
  );
}
