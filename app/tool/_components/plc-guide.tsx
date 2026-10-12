'use client';

import Link from '@/components/site-link';
import type { ToolSlug } from '@/lib/tools/registry';
import { useToolLanguage } from '@/components/tool-language';
import './plc-guide.css';

function AnalogGuide() {
  return (
    <>
      <h3>開始前：確認訊號量程與工程量程</h3>
      <p>
        訊號量程是傳送器輸出的電流或電壓，例如 4–20
        mA；工程量程是它代表的壓力、溫度或液位，例如 0–10
        bar。請先核對傳送器設定及 PLC 通道設定，不要把模組的原始數位值直接填進
        mA 欄位。若手上的數字是模組讀值，請使用{' '}
        <Link href="/tool/plc-scaling">PLC 原始值縮放工具</Link>。
      </p>
      <h3>操作案例：12 mA 代表多少壓力？</h3>
      <p>假設壓力傳送器設定為 4–20 mA 對應 0–10 bar，目前量到 12 mA。</p>
      <ol>
        <li>
          「常用訊號」選 4–20 mA，「輸入種類」選「訊號值」。確認訊號下限為
          4、上限為 20。
        </li>
        <li>「訊號值」填 12，「工程下限」填 0，「工程上限」填 10。</li>
        <li>
          結果應為工程值 5、百分比
          50%。工程值欄不附物理單位，此例依傳送器設定解讀為 5 bar。
        </li>
      </ol>
      <p>
        先算量程比例：(12 − 4) ÷ (20 − 4) = 0.5，再算壓力：0 + 0.5 × (10 − 0) =
        5 bar。4 mA 是這個量程的起點，所以不能直接用 12 ÷ 20 計算百分比。
      </p>
      <table>
        <caption>4–20 mA 對應 0–10 bar 的核對點</caption>
        <thead>
          <tr>
            <th scope="col">訊號</th>
            <th scope="col">量程百分比</th>
            <th scope="col">壓力</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>4 mA</td>
            <td>0%</td>
            <td>0 bar</td>
          </tr>
          <tr>
            <td>12 mA</td>
            <td>50%</td>
            <td>5 bar</td>
          </tr>
          <tr>
            <td>20 mA</td>
            <td>100%</td>
            <td>10 bar</td>
          </tr>
        </tbody>
      </table>
      <h3>反算訊號與換算其他量程</h3>
      <p>
        沿用上述上下限，把「輸入種類」改成「工程值」並填 7.5，會得到 16 mA 與
        75%。若選「百分比」，填 75
        也應得到相同結果。切換種類後要重新填入對應的數值，工具會保留原輸入內容。
      </p>
      <p>
        若要比較相同比例的電壓訊號，在 12 mA 案例中將「轉換到其他訊號」選為 0–10
        V，目標訊號會是 5
        V。這是量程比例換算；實際把電流轉為電壓仍需要合適的硬體。
      </p>
      <h3>結果不合理時，依序檢查</h3>
      <ul>
        <li>
          零點有偏差：核對是否把 4–20 mA 選成 0–20 mA，以及工程下限是否真的為
          0。
        </li>
        <li>
          結果差固定倍數：核對 bar、kPa 等單位與傳送器實際設定，並確認 PLC
          是否已做過一次縮放。
        </li>
        <li>
          超出量程：輸入 22 mA 會得到 112.5% 與 11.25
          bar，並出現外推提示。這只是數學延伸，不能據此認定感測器仍能準確量測。
        </li>
        <li>
          上限不大於下限：本工具會拒絕計算，目前不支援反向量程。斷線或故障電流的判定值，請查該傳送器與模組手冊。
        </li>
      </ul>
    </>
  );
}

function PlcScalingGuide() {
  return (
    <>
      <h3>先找出模組真正交給程式的原始量程</h3>
      <p>
        查目標 PLC
        類比模組的型號、通道模式與手冊，記下所選模式在量程兩端對應的原始數值，再查傳送器或工程設定的單位與上下限。0–4095、0–27648、0–32000
        只是可快速填入的範例；不知道模組規格時，選「自訂」並暫停判讀，不能猜一個看似合理的預設值。
      </p>
      <h3>操作案例：原始值 13824 對應多少壓力？</h3>
      <p>
        假設已確認某通道把 0–27648 對應 0–100
        kPa。這是離線假設案例，不代表任何指定模組。
      </p>
      <ol>
        <li>方向選「原始值 → 工程值」，原始下限填 0、上限填 27648。</li>
        <li>工程下限填 0、上限填 100，原始值填 13824。</li>
        <li>
          結果應為工程值 50、百分比 50%、狀態「範圍內」；單位依本例設定解讀為 50
          kPa。
        </li>
      </ol>
      <p>
        核算：(13824 − 0) ÷ (27648 − 0) = 0.5；0 + 0.5 × (100 − 0) = 50
        kPa。切到「工程值 → 原始值」並在同一輸入欄填 75，應得到原始值
        20736、百分比 75%。切換方向後要重新填入對應數值。
      </p>
      <h3>結果不對時下一步</h3>
      <ul>
        <li>
          狀態「超出範圍」只是線性外推，不代表現場量測仍有效；先核對通道診斷、原始碼與傳送器狀態。
        </li>
        <li>
          結果差固定倍數時，確認工程單位、傳送器設定及 PLC
          是否已縮放一次，避免重複換算。
        </li>
        <li>
          空值、非數字或上限不大於下限會被拒絕；先回到手冊確認範圍，不要修改數字只為讓工具通過。
        </li>
        <li>
          此工具不判定斷線、超量程電流、品質旗標或實體設備誤差；帶著原始值、模組設定與量測點閱讀下方對應教學。
        </li>
      </ul>
    </>
  );
}

function BaseGuide() {
  return (
    <>
      <h3>先決定位元數與有號解讀方式</h3>
      <p>
        同一組位元的十進位結果會隨位元數與有號設定改變。先從設備資料表確認欄位是
        8、16 或 32
        bit，以及是否採有號整數。本工具換算整數的位元表示，不會交換位元組，也不會替資料套用工程倍率。
      </p>
      <h3>操作案例：8-bit 的 FF 是多少？</h3>
      <ol>
        <li>輸入進位選「十六進位」，位元數選「8 bit」，數值填 FF。</li>
        <li>解讀方式選「無號整數」，十進位應為 255、二進位為 11111111。</li>
        <li>
          只把解讀方式改為「有號二補數」，十進位應變成 −1；十六進位仍是 FF。
        </li>
      </ol>
      <p>
        反向核對時選十進位、8 bit、有號二補數並輸入 −1，十六進位也應得到
        FF。8-bit 的最高位為符號位，FF 的無號值 255 減去 256，就是有號值 −1。
      </p>
      <h3>結果不符時檢查</h3>
      <ul>
        <li>十六進位欄只填 FF，不加 0x；二進位也不加 0b。</li>
        <li>
          8-bit 無號最多 255、有號十進位範圍為 −128 至 127；超出時工具會拒絕。
        </li>
        <li>
          若兩個 Modbus 暫存器組合成 32-bit 值，先依設備手冊確認字序，再用{' '}
          <Link href="/tool/register-converter">暫存器資料解析工具</Link>
          ；單純進位換算不能判定字序或 Float32。
        </li>
      </ul>
    </>
  );
}

function AddressGuide() {
  return (
    <>
      <h3>先分清楚：參考編號、序號與封包位址</h3>
      <p>
        設備文件中的 40001 常用來表示第一個 Holding Register；在這個慣例下，從 1
        起算序號是 1，封包內的零起算位址是 0。開頭的 4
        表示資料區，不是要放進封包的位址，也不是讀取功能碼。
      </p>
      <p>
        有些手冊直接列出零起算位址，有些通訊軟體會自動扣
        1。先確認文件與軟體各自使用哪一種格式，再選擇本工具的「輸入種類」，避免重複扣
        1。
      </p>
      <h3>操作案例：讀取文件上的 40010</h3>
      <ol>
        <li>
          「資料區」選 Holding Register (4x)，「參考編號位數」選「五位數」。
        </li>
        <li>「輸入種類」選「參考編號」，填入 40010。</li>
        <li>
          結果應為零起算位址 9、從 1 起算序號 10、HEX 位址 0009、讀取功能碼 03。
        </li>
      </ol>
      <p>
        計算方式是 40010 − 40001 =
        9。如果通訊指令要求封包位址，這個例子的起始位址欄應為 00 09；若軟體要求
        4xxxx 參考編號，則仍填 40010。不要只看欄位叫「Address」就假定位址格式。
      </p>
      <table>
        <caption>本工具採用的五位數參考編號慣例</caption>
        <thead>
          <tr>
            <th scope="col">資料區</th>
            <th scope="col">第一個參考編號</th>
            <th scope="col">零起算位址</th>
            <th scope="col">讀取功能碼</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Coil</td>
            <td>00001</td>
            <td>0</td>
            <td>01</td>
          </tr>
          <tr>
            <td>Discrete Input</td>
            <td>10001</td>
            <td>0</td>
            <td>02</td>
          </tr>
          <tr>
            <td>Input Register</td>
            <td>30001</td>
            <td>0</td>
            <td>04</td>
          </tr>
          <tr>
            <td>Holding Register</td>
            <td>40001</td>
            <td>0</td>
            <td>03</td>
          </tr>
        </tbody>
      </table>
      <h3>六位數與輸入格式</h3>
      <p>
        文件若寫 400001，請選「六位數」；在 Holding Register
        區，它仍對應零起算位址 0。工具的五位數模式支援位址
        0–9998，六位數模式支援
        0–65535。這是本工具的參考編號表示範圍，不代表設備實際開放所有位址。
      </p>
      <p>
        參考編號必須符合所選位數，例如 Coil 的第一筆要輸入
        00001。零起算位址與序號欄使用十進位整數；若文件列
        0x0009，請選「零起算位址」並輸入
        9。切換資料區、位數或輸入種類後，請重新確認欄位值。
      </p>
      <h3>讀不到或讀到隔壁資料時</h3>
      <ul>
        <li>差一筆：核對主站是否已自動扣 1，以及文件是否本來就是零起算。</li>
        <li>
          資料區錯誤：30001 與 40001 雖然都換算成位址 0，但讀取功能碼分別是 04
          與 03，不能互換。
        </li>
        <li>
          數值異常：若資料是 32 位元，通常需依手冊讀取連續兩個 16
          位元暫存器，再用{' '}
          <Link href="/tool/register-converter">暫存器轉換工具</Link> 解碼。
        </li>
        <li>
          設備回報非法位址：檢查起始位址與讀取數量是否跨越未定義區域。工具只換算編號，不會查詢設備的暫存器表。
        </li>
      </ul>
    </>
  );
}

function CrcGuide() {
  return (
    <>
      <h3>輸入的是 HEX 資料，不是畫面上的文字編碼</h3>
      <p>
        本工具計算 Modbus RTU 的
        CRC-16。輸入每個位元組的兩位十六進位數，以空白或逗號分隔，例如 01 03 00
        00 00 0A。不要加 0x 前綴，也不要把整串連成
        01030000000A。輸入範圍從站號開始，包含功能碼與資料，但不包含原本的 CRC。
      </p>
      <h3>操作案例：站號 1，從位址 0 讀取 10 個保持暫存器</h3>
      <ol>
        <li>
          在「HEX 位元組（空白或逗號分隔）」填入 <code>01 03 00 00 00 0A</code>
          。
        </li>
        <li>確認「CRC 數值」為 CDC5，「封包傳送順序」為 C5 CD。</li>
        <li>
          「完整封包」應為 <code>01 03 00 00 00 0A C5 CD</code>
          ，可用「複製完整封包」取得結果。
        </li>
      </ol>
      <table>
        <caption>此讀取請求的位元組拆解</caption>
        <thead>
          <tr>
            <th scope="col">HEX</th>
            <th scope="col">意義</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>01</td>
            <td>站號 1</td>
          </tr>
          <tr>
            <td>03</td>
            <td>讀取 Holding Registers</td>
          </tr>
          <tr>
            <td>00 00</td>
            <td>起始位址 0；若採五位數參考編號慣例，即 40001</td>
          </tr>
          <tr>
            <td>00 0A</td>
            <td>讀取數量 10 個暫存器，不是 10 個位元組</td>
          </tr>
          <tr>
            <td>C5 CD</td>
            <td>CRC 低位元組在前</td>
          </tr>
        </tbody>
      </table>
      <h3>為什麼 CDC5 傳送時變成 C5 CD？</h3>
      <p>
        CRC 數值用一般十六進位寫法顯示為 CDC5，其中高位元組是 CD、低位元組是
        C5。Modbus RTU 在封包尾端先傳 CRC 低位元組，所以附加 C5 CD。此規則是針對
        CRC，不能因此把起始位址 00 09 也顛倒成 09 00。
      </p>
      <p>
        核對一筆抓到的封包時，先移除最後兩個 CRC
        位元組，再把剩下的資料輸入本工具。將「封包傳送順序」與原封包尾端比較；不要連原
        CRC 一起輸入後，把新產生的 CRC 再附加一次。
      </p>
      <h3>CRC 一致，為什麼仍然沒有回應？</h3>
      <ul>
        <li>
          CRC
          相符只表示這段資料的校驗一致，不代表站號、功能碼、位址或讀取數量符合設備要求。
        </li>
        <li>
          確認主站軟體是否自動附加 CRC；若已自動處理，不要再貼入含 CRC
          的完整封包，避免重複附加。
        </li>
        <li>
          沒有回應時，另查站號、鮑率、同位元與停止位元設定、接線及逾時。工具不會連接串列埠或檢查傳送時序。
        </li>
        <li>
          這個校驗用於 RTU。Modbus ASCII 使用 LRC；Modbus TCP
          使用不同的封裝，不能直接在其封包尾端套用此 CRC。
        </li>
      </ul>
    </>
  );
}

function RegisterGuide() {
  return (
    <>
      <h3>開始前：先查型別，再查排列</h3>
      <p>
        一個 Modbus 暫存器是 16 位元，但同一組位元可以有不同解讀。UInt16
        是無號整數、Int16 是有號整數；UInt32、Int32 與 Float32
        則需要兩個暫存器。請依設備暫存器表選型別，不能因為畫面要顯示小數，就直接選
        Float32。
      </p>
      <p>
        例如設備可能以整數 125 表示 12.5 °C，這時要先依手冊以整數解碼，再除以
        10。本工具負責資料表示轉換，不會自動套用設備的倍率或單位。
      </p>
      <h3>操作案例：把 Float32 的 12.5 轉成暫存器</h3>
      <ol>
        <li>
          「方向」選「數值 → 暫存器」，「資料型別」選「Float32 (IEEE 754)」。
        </li>
        <li>
          「位元組排列」選 ABCD，「數值」填 12.5，結果應為{' '}
          <code>4148 0000</code>。
        </li>
        <li>
          要驗算讀回資料，將方向改為「暫存器 → 數值」，並把輸入改成{' '}
          <code>4148 0000</code>，同樣選 Float32 與 ABCD，應還原為 12.5。
        </li>
      </ol>
      <p>
        切換方向時，原輸入內容會保留，需自行改填新方向需要的格式。反解時每個暫存器都要填滿四位
        HEX，兩個暫存器以空白分隔；不要輸入十進位暫存器值或 0x 前綴。
      </p>
      <table>
        <caption>
          12.5 的 Float32 位元組為 41 48 00 00；以下是本工具四種排列
        </caption>
        <thead>
          <tr>
            <th scope="col">排列</th>
            <th scope="col">暫存器 HEX</th>
            <th scope="col">相對 ABCD 的變化</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ABCD</td>
            <td>4148 0000</td>
            <td>保持順序</td>
          </tr>
          <tr>
            <td>BADC</td>
            <td>4841 0000</td>
            <td>各暫存器內交換兩個位元組</td>
          </tr>
          <tr>
            <td>CDAB</td>
            <td>0000 4148</td>
            <td>交換前後兩個暫存器</td>
          </tr>
          <tr>
            <td>DCBA</td>
            <td>0000 4841</td>
            <td>四個位元組順序反轉</td>
          </tr>
        </tbody>
      </table>
      <h3>如何解讀讀回的兩個暫存器？</h3>
      <p>
        如果手冊指定低字在前，且讀回 <code>0000 4148</code>，可選 CDAB 反解為
        12.5。ABCD
        等標記以本表的位元組定義為準；不同軟體對「大小端」的命名可能不同，請比較實際位元組順序。
      </p>
      <p>
        不要只挑一個看起來合理的數字就認定排列正確。先核對手冊，再用設備已知值交叉比對。32
        位元讀取還要確認起始位址與連續兩筆暫存器的順序。
      </p>
      <h3>常見錯誤與限制</h3>
      <ul>
        <li>
          負值變成大正數：<code>FFFF</code> 選 Int16 是 −1，選 UInt16 是
          65535，應核對有號或無號定義。
        </li>
        <li>
          讀回數值極大或極小：先查資料型別與排列，再查位址；整數位元不能直接當浮點數使用。
        </li>
        <li>
          小數尾端略有差異：Float32 的精度有限，例如 0.1
          無法用此格式精確表示，往返轉換可能出現近似值。
        </li>
        <li>
          16 位元型別只輸入一個暫存器，頁面不提供位元組排列選項；32
          位元型別輸入兩個。本工具不支援 Float64，且不接受 NaN 或 Infinity
          結果。
        </li>
      </ul>
    </>
  );
}

const guides = {
  analog: AnalogGuide,
  'plc-scaling': PlcScalingGuide,
  'base-converter': BaseGuide,
  'modbus-address': AddressGuide,
  'modbus-crc': CrcGuide,
  'register-converter': RegisterGuide,
};

function EnglishGuide({ slug }: { slug: keyof typeof guides }) {
  if (slug === 'analog')
    return (
      <>
        <h3>Before you start: identify both ranges</h3>
        <p>
          The signal range is the transmitter output, such as 4–20 mA. The
          engineering range is the pressure, temperature or level it represents,
          such as 0–10 bar. Confirm the transmitter and PLC channel settings
          first. If your value is a module raw count, use the{' '}
          <Link href="/tool/plc-scaling">PLC Raw Value Scaling tool</Link>.
        </p>
        <h3>Worked case: what pressure does 12 mA represent?</h3>
        <ol>
          <li>Select 4–20 mA and Signal value.</li>
          <li>Enter signal 12, engineering minimum 0 and maximum 10.</li>
          <li>The result is 5 at 50%, which is 5 bar for this transmitter.</li>
        </ol>
        <p>
          The range fraction is (12 − 4) ÷ (20 − 4) = 0.5, then 0 + 0.5 × (10 −
          0) = 5 bar. Do not use 12 ÷ 20 because 4 mA is the live-zero starting
          point.
        </p>
        <h3>If the result looks wrong</h3>
        <ul>
          <li>Check whether 4–20 mA was accidentally entered as 0–20 mA.</li>
          <li>
            Check engineering units and whether the PLC already scales the
            value.
          </li>
          <li>
            A value above range is mathematical extrapolation, not proof that
            the sensor remains accurate.
          </li>
          <li>
            The tool rejects a maximum that is not greater than the minimum;
            consult the device manual for fault-current limits.
          </li>
        </ul>
      </>
    );
  if (slug === 'plc-scaling')
    return (
      <>
        <h3>Get the raw range from your actual module</h3>
        <p>
          Identify the PLC analog module model, channel mode and manual. Record
          the raw counts at both ends of that mode, then confirm the
          transmitter&apos;s engineering unit and limits. The 0–4095, 0–27648
          and 0–32000 presets are examples, not specifications for every PLC. If
          the range is unknown, confirm it before interpreting a result.
        </p>
        <h3>Worked case: raw count 13824</h3>
        <p>
          Assume a documented channel maps 0–27648 to 0–100 kPa. This is an
          offline example, not a claim about a specific module.
        </p>
        <ol>
          <li>
            Select Raw value → Engineering value. Enter raw low 0, raw high
            27648, engineering low 0 and high 100.
          </li>
          <li>
            Enter raw value 13824. The result is 50 at 50%, shown as In range.
            For this example, that means 50 kPa.
          </li>
          <li>
            For the reverse check, select Engineering value → Raw value and
            replace the input with 75. The result is raw count 20736 at 75%.
          </li>
        </ol>
        <p>
          The forward fraction is (13824 − 0) ÷ (27648 − 0) = 0.5, giving 0 +
          0.5 × 100 = 50 kPa.
        </p>
        <h3>When the result looks wrong</h3>
        <ul>
          <li>
            Out of range means linear extrapolation only. Check channel
            diagnostics, raw data and transmitter state before treating it as a
            measurement.
          </li>
          <li>
            For a fixed-factor error, compare engineering units, transmitter
            setup and any scaling already applied in the PLC.
          </li>
          <li>
            Blank or invalid numbers and a high limit no greater than the low
            limit are rejected. Verify the manual rather than changing a value
            merely to pass validation.
          </li>
          <li>
            This calculator does not detect open circuits, overrange current,
            bad quality or physical measurement error.
          </li>
        </ul>
      </>
    );
  if (slug === 'base-converter')
    return (
      <>
        <h3>Choose the bit width and signed interpretation first</h3>
        <p>
          The same bits have different decimal meanings depending on width and
          signedness. Check the device map for 8, 16 or 32 bits and whether the
          field is signed. This tool changes integer notation; it does not swap
          bytes or apply an engineering scale factor.
        </p>
        <h3>Worked case: interpret 8-bit FF</h3>
        <ol>
          <li>Select hexadecimal input, 8 bit and enter FF.</li>
          <li>Unsigned shows decimal 255 and binary 11111111.</li>
          <li>Signed two&apos;s complement shows decimal −1; hex stays FF.</li>
        </ol>
        <p>
          For a reverse check, select signed decimal, 8 bit and enter −1. The
          hex result is FF. The signed value is 255 − 256 = −1.
        </p>
        <h3>If the result does not match the device</h3>
        <ul>
          <li>Enter FF without a 0x prefix, or binary without a 0b prefix.</li>
          <li>
            An 8-bit unsigned input ends at 255; signed decimal runs from −128
            to 127. Out-of-range input is rejected.
          </li>
          <li>
            For two Modbus registers, determine word order from the device
            manual and use the{' '}
            <Link href="/tool/register-converter">
              Registers &amp; Floating Point tool
            </Link>
            . Base conversion alone cannot determine word order or Float32.
          </li>
        </ul>
      </>
    );
  if (slug === 'modbus-address')
    return (
      <>
        <h3>Separate reference numbers from protocol addresses</h3>
        <p>
          In the common convention, 40001 means the first Holding Register,
          while the zero-based address placed in the request is 0. The leading 4
          identifies the data area; it is neither the transmitted address nor
          the function code.
        </p>
        <h3>Worked case: document reference 40010</h3>
        <ol>
          <li>
            Select Holding Register (4x), five-digit references and Reference
            number.
          </li>
          <li>Enter 40010.</li>
          <li>
            The result is zero-based address 9, one-based index 10, HEX 0009 and
            read function 03.
          </li>
        </ol>
        <p>
          Some manuals already list zero-based addresses, and some master
          software subtracts one automatically. Confirm both conventions before
          entering a value.
        </p>
        <h3>When the device returns the wrong register</h3>
        <ul>
          <li>
            An off-by-one result usually means the value was adjusted twice.
          </li>
          <li>
            Input Registers use function 04; Holding Registers use function 03.
          </li>
          <li>
            For 32-bit data, read two consecutive registers and decode them with
            the{' '}
            <Link href="/tool/register-converter">
              Registers & Floating Point tool
            </Link>
            .
          </li>
          <li>
            This tool converts notation only; it cannot verify a device register
            map.
          </li>
        </ul>
      </>
    );
  if (slug === 'modbus-crc')
    return (
      <>
        <h3>Enter RTU bytes, without an existing CRC</h3>
        <p>
          Enter two-digit HEX bytes separated by spaces or commas, starting with
          the slave address and including the function and data. Do not include
          0x prefixes or the CRC already present in a captured frame.
        </p>
        <h3>Worked case: read 10 Holding Registers from address 0</h3>
        <ol>
          <li>
            Enter <code>01 03 00 00 00 0A</code>.
          </li>
          <li>The CRC value is CDC5 and its wire order is C5 CD.</li>
          <li>
            The complete frame is <code>01 03 00 00 00 0A C5 CD</code>.
          </li>
        </ol>
        <p>
          Modbus RTU sends the low CRC byte first. This does not mean the
          two-byte start address should also be reversed.
        </p>
        <h3>A matching CRC does not prove the request is valid</h3>
        <ul>
          <li>
            Also verify slave ID, function, address, quantity, serial settings
            and wiring.
          </li>
          <li>
            Do not add a CRC manually when the master software already adds one.
          </li>
          <li>
            This CRC applies to Modbus RTU, not Modbus ASCII or Modbus TCP.
          </li>
        </ul>
      </>
    );
  return (
    <>
      <h3>Choose the data type before the byte order</h3>
      <p>
        One Modbus register is 16 bits. UInt16 and Int16 use one register;
        UInt32, Int32 and Float32 use two. Select the type documented by the
        device. A stored integer such as 125 may represent 12.5 °C after a
        separate scale factor.
      </p>
      <h3>Worked case: encode Float32 value 12.5</h3>
      <ol>
        <li>Select Value → registers, Float32 (IEEE 754) and ABCD.</li>
        <li>
          Enter 12.5; the result is <code>4148 0000</code>.
        </li>
        <li>
          Reverse the direction with the same type and order to recover 12.5.
        </li>
      </ol>
      <p>
        The same four bytes appear as 4841 0000 in BADC, 0000 4148 in CDAB and
        0000 4841 in DCBA. Compare actual byte order rather than relying only on
        software labels such as “big endian”.
      </p>
      <h3>Common interpretation errors</h3>
      <ul>
        <li>FFFF is −1 as Int16 but 65535 as UInt16.</li>
        <li>
          Implausible values usually indicate a type, order or address mismatch.
        </li>
        <li>
          Float32 has limited precision, so decimal round trips can be
          approximate.
        </li>
        <li>
          This tool supports 16- and 32-bit values, not Float64, NaN or
          Infinity.
        </li>
      </ul>
    </>
  );
}

export default function PlcGuide({ slug }: { slug: ToolSlug }) {
  const { locale, tr } = useToolLanguage();
  if (!(slug in guides)) return null;
  const Guide = guides[slug as keyof typeof guides];
  return (
    <section className="plc-guide" aria-labelledby="plc-guide-title">
      <p className="eyebrow">
        {tr('使用教學 / PLC 與通訊', 'GUIDE / PLC & COMMUNICATIONS')}
      </p>
      <h2 id="plc-guide-title">
        {tr(
          '從輸入設定到結果判讀',
          'From input setup to result interpretation',
        )}
      </h2>
      {locale === 'en' ? (
        <EnglishGuide slug={slug as keyof typeof guides} />
      ) : (
        <Guide />
      )}
      <footer className="plc-guide-footer">
        <p>
          {tr(
            '範例為離線計算與格式核對，未連接實際 PLC、傳送器或 RS485 設備驗證。設備量程、資料格式與通訊設定仍須依對應型號手冊確認。',
            'These examples are offline calculations and format checks; they were not validated against a physical PLC, transmitter or RS485 device. Confirm ranges, data formats and communication settings in the manual for your exact model.',
          )}
        </p>
        {!['analog', 'plc-scaling', 'base-converter'].includes(slug) && (
          <p>
            {tr('規格參考：', 'Specification reference: ')}
            <a href="https://www.modbus.org/modbus-specifications">
              {tr(
                'Modbus Organization 官方規格入口',
                'Modbus Organization specifications',
              )}
            </a>
            {tr(
              '（Application Protocol V1.1b3、Serial Line V1.02）。',
              ' (Application Protocol V1.1b3 and Serial Line V1.02).',
            )}
          </p>
        )}
      </footer>
    </section>
  );
}
