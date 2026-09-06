import Calculator from '../_calculators/qrcode';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('qrcode');
export default function Page() {
  return (
    <ToolPage slug="qrcode">
      <Calculator />
    </ToolPage>
  );
}
