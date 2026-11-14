import Calculator from '../_calculators/name-transliterator';
import ToolPage, { toolMetadata } from '../_components/tool-page';
export const metadata = toolMetadata('name-transliterator');
export default function Page() {
  return (
    <ToolPage slug="name-transliterator">
      <Calculator />
    </ToolPage>
  );
}
