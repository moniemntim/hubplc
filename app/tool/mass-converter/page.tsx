import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('mass-converter');

export default function Page() {
  return (
    <ToolPage slug="mass-converter">
      <Calculator fixedGroup="mass" />
    </ToolPage>
  );
}
