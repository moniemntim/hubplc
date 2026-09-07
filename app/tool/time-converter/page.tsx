import Calculator from '../_calculators/unit-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('time-converter');

export default function Page() {
  return (
    <ToolPage slug="time-converter">
      <Calculator fixedGroup="time" />
    </ToolPage>
  );
}
