import Calculator from '../_calculators/text-case';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('text-case');

export default function Page() {
  return (
    <ToolPage slug="text-case">
      <Calculator />
    </ToolPage>
  );
}
