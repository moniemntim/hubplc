import Calculator from '../_calculators/rmb-uppercase';
import ToolPage, { toolMetadata } from '../_components/tool-page';

export const metadata = toolMetadata('rmb-uppercase');

export default function Page() {
  return (
    <ToolPage slug="rmb-uppercase">
      <Calculator />
    </ToolPage>
  );
}
