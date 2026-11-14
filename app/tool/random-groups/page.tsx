import Calculator from '../_calculators/random-tasks';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('random-groups');
export default function Page() {
  return (
    <ToolPage slug="random-groups">
      <Calculator kind="random-groups" />
    </ToolPage>
  );
}
