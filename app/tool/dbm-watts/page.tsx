import Calculator from '../_calculators/dbm-watts';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('dbm-watts');
export default function Page() {
  return (
    <ToolPage slug="dbm-watts">
      <Calculator />
    </ToolPage>
  );
}
