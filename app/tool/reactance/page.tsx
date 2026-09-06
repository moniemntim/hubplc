import Calculator from '../_calculators/reactance';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('reactance');
export default function Page() {
  return (
    <ToolPage slug="reactance">
      <Calculator />
    </ToolPage>
  );
}
