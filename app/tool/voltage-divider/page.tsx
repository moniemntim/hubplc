import Calculator from '../_calculators/voltage-divider';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('voltage-divider');
export default function Page() {
  return (
    <ToolPage slug="voltage-divider">
      <Calculator />
    </ToolPage>
  );
}
