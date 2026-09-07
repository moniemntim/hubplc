import Calculator from '../_calculators/timestamp-converter';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('timestamp-converter');

export default function Page() {
  return (
    <ToolPage slug="timestamp-converter">
      <Calculator />
    </ToolPage>
  );
}
