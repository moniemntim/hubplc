import Link from '@/components/site-link';
import type { ToolSlug } from '@/lib/tools/registry';
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
  'modbus-address': AddressGuide,
  'modbus-crc': CrcGuide,
  'register-converter': RegisterGuide,
};

export default function PlcGuide({ slug }: { slug: ToolSlug }) {
  if (!(slug in guides)) return null;
  const Guide = guides[slug as keyof typeof guides];
  return (
    <section className="plc-guide" aria-labelledby="plc-guide-title">
      <p className="eyebrow">使用教學 / PLC 與通訊</p>
      <h2 id="plc-guide-title">從輸入設定到結果判讀</h2>
      <Guide />
      <footer className="plc-guide-footer">
        <p>
          範例為離線計算與格式核對，未連接實際 PLC、傳送器或 RS485
          設備驗證。設備量程、資料格式與通訊設定仍須依對應型號手冊確認。
        </p>
        {slug !== 'analog' && (
          <p>
            規格參考：
            <a href="https://www.modbus.org/modbus-specifications">
              Modbus Organization 官方規格入口
            </a>
            （Application Protocol V1.1b3、Serial Line V1.02）。
          </p>
        )}
      </footer>
    </section>
  );
}
