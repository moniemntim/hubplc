import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('power-converter');

export default function Page() {
  return (
    <ToolPage slug="power-converter">
      <Calculator fixedGroup="power" />
    </ToolPage>
  );
}
