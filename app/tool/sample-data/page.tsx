import Calculator from '../_calculators/sample-data';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('sample-data');

export default function Page() {
  return (
    <ToolPage slug="sample-data">
      <Calculator kind="sample-data" />
    </ToolPage>
  );
}
