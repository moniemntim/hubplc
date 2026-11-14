import Calculator from '../_calculators/random-tasks';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('random-draw');
export default function Page() {
  return (
    <ToolPage slug="random-draw">
      <Calculator kind="random-draw" />
    </ToolPage>
  );
}
