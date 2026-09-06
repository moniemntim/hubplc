import Calculator from '../_calculators/text-repair';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('text-repair');
export default function Page() {
  return (
    <ToolPage slug="text-repair">
      <Calculator />
    </ToolPage>
  );
}
