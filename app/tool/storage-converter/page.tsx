import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('storage-converter');

export default function Page() {
  return (
    <ToolPage slug="storage-converter">
      <Calculator fixedGroup="storage" />
    </ToolPage>
  );
}
