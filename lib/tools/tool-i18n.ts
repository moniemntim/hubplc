import type { ToolSlug } from './registry';

export const categoryEnglish: Record<string, string> = {
  全部: 'All',
  單位: 'Units',
  編碼: 'Encoding',
  電路: 'Electrical',
  'PLC 與通訊': 'PLC & Communications',
};

type EnglishToolCopy = { name: string; description: string; example: string };

export const toolEnglish = {
  stopwatch: {
    name: 'Online Stopwatch',
    description:
      'Start, pause and record laps with fullscreen, keyboard shortcuts, ECO mode and share links.',
    example:
      'Lap 1 totals 10 seconds and lap 2 totals 25 seconds, so the second lap time is 15 seconds.',
  },
  'world-clock': {
    name: 'World Clock & Taipei Time',
    description:
      'Live world clock defaulting to Taipei, with city, country/region and UTC-offset search.',
    example:
      'When Taipei is 16:00, UTC is 08:00; dates and offsets update for daylight saving time.',
  },
  'timestamp-converter': {
    name: 'Unix Timestamp Converter',
    description:
      'Convert Unix seconds or milliseconds to and from Taipei date/time, with the current timestamp.',
    example: 'Unix timestamp 1767196800 is 2026-01-01 00:00:00 in Taipei.',
  },
  'date-calculator': {
    name: 'Date Calculator',
    description:
      'Find the days between two dates or a date before/after a given number of days, using Taipei for today.',
    example:
      '2024-02-28 plus 2 days is 2024-03-01; differences use calendar days.',
  },
  'length-converter': {
    name: 'Length Converter',
    description:
      'Convert metric, imperial and nautical lengths including millimetres, metres, feet and miles.',
    example: '1 inch = 25.4 mm; 1 ft = 0.3048 m.',
  },
  'temperature-converter': {
    name: 'Temperature Converter',
    description:
      'Convert Celsius, Fahrenheit, Kelvin, Rankine and Réaumur temperature scales.',
    example: '0 °C = 32 °F = 273.15 K.',
  },
  'mass-converter': {
    name: 'Weight & Mass Converter',
    description:
      'Convert milligrams, grams, kilograms, metric tonnes, pounds and ounces.',
    example: '1 lb = 0.45359237 kg.',
  },
  'area-converter': {
    name: 'Area Converter',
    description:
      'Convert square metres, square centimetres, hectares, square feet and other area units.',
    example: '1 ha = 10000 m².',
  },
  'volume-converter': {
    name: 'Volume Converter',
    description:
      'Convert millilitres, litres, cubic metres, US gallons and imperial gallons.',
    example: '1 US gallon = 3.785411784 L.',
  },
  'pressure-converter': {
    name: 'Pressure Converter',
    description:
      'Convert Pa, kPa, MPa, bar, psi, standard atmospheres and water-column pressure.',
    example: '1 bar = 100 kPa.',
  },
  'power-converter': {
    name: 'Power Unit Converter',
    description:
      'Convert watts, kilowatts, megawatts, mechanical horsepower and metric horsepower.',
    example:
      '1 kW = 1000 W. Mechanical and metric horsepower use different definitions.',
  },
  'time-converter': {
    name: 'Time Unit Converter',
    description:
      'Convert microseconds, milliseconds, seconds, minutes, hours and days.',
    example: '1 h = 60 min = 3600 s.',
  },
  'angle-converter': {
    name: 'Angle Converter',
    description:
      'Convert degrees, radians, gradians, turns, arcminutes and arcseconds.',
    example: '180° = π rad = 0.5 turns.',
  },
  'capacitance-converter': {
    name: 'Capacitance Converter',
    description:
      'Convert farads, millifarads, microfarads, nanofarads and picofarads.',
    example: '1 µF = 1000 nF = 1000000 pF.',
  },
  'speed-converter': {
    name: 'Speed Converter',
    description:
      'Convert metres per second, kilometres per hour, feet per second, miles per hour and knots.',
    example: '1 m/s = 3.6 km/h.',
  },
  'storage-converter': {
    name: 'Data Storage Converter',
    description: 'Convert bits, bytes, decimal kB/GB and binary KiB/GiB units.',
    example: '1 GB = 1000000000 bytes; 1 GiB = 1073741824 bytes.',
  },
  'rmb-uppercase': {
    name: 'TWD Amount in Chinese Numerals',
    description:
      'Convert a New Taiwan dollar amount to formal Traditional Chinese numerals, including yuan, jiao and fen.',
    example: '1001.05 → 新臺幣壹仟零壹圓零伍分.',
  },
  'text-case': {
    name: 'English Letter Case Converter',
    description:
      'Convert English text to upper, lower, title or sentence case, or invert its case.',
    example: 'Hello PLC → HELLO PLC or hello plc.',
  },
  'currency-converter': {
    name: 'Currency Converter',
    description:
      'Convert among 20 currencies including TWD, USD and CNY, with the reference-rate date shown.',
    example:
      'At a manual rate of 1 USD = 32 TWD, 100 USD = 3200 TWD; this is a sample rate.',
  },
  'amps-to-watts': {
    name: 'Amps to Watts Calculator',
    description:
      'Calculate watts and apparent power from voltage, current, phase and power factor.',
    example: 'Single-phase 220 V, 10 A, PF 0.8: real power is 1760 W.',
  },
  'amps-to-kilowatts': {
    name: 'Amps to Kilowatts Calculator',
    description:
      'Calculate kW for DC, single-phase or balanced three-phase current.',
    example:
      'Balanced three-phase 380 V, 20 A, PF 0.8: real power is about 10.531 kW.',
  },
  'amps-to-va': {
    name: 'Amps to VA Calculator',
    description: 'Convert amps to VA apparent power using voltage and phase.',
    example: 'Single-phase 220 V, 10 A: apparent power is 2200 VA.',
  },
  'amps-to-kva': {
    name: 'Amps to kVA Calculator',
    description: 'Convert line current to kVA using voltage and phase.',
    example:
      'Balanced three-phase 380 V, 20 A: apparent power is about 13.164 kVA.',
  },
  'volts-to-watts': {
    name: 'Volts to Watts Calculator',
    description: 'Calculate watts from voltage, current and power factor.',
    example: 'Single-phase 220 V, 10 A, PF 0.8: real power is 1760 W.',
  },
  'volts-to-amps': {
    name: 'Volts to Amps Calculator',
    description: 'Calculate current from voltage, load power and power factor.',
    example: 'Single-phase 1 kW, 220 V, PF 0.8: current is about 5.682 A.',
  },
  'watts-to-amps': {
    name: 'Watts to Amps Calculator',
    description:
      'Calculate current from watts, voltage, phase and power factor.',
    example: 'Single-phase 1000 W, 220 V, PF 0.8: current is about 5.682 A.',
  },
  'kw-to-amps': {
    name: 'Kilowatts to Amps Calculator',
    description:
      'Calculate single-phase or balanced three-phase line current from kW and voltage.',
    example:
      'Balanced three-phase 10 kW, 380 V, PF 0.8: line current is about 18.992 A.',
  },
  'kva-to-amps': {
    name: 'kVA to Amps Calculator',
    description:
      'Calculate single-phase or balanced three-phase current from kVA and voltage.',
    example:
      'Balanced three-phase 10 kVA, 380 V: line current is about 15.193 A.',
  },
  'mva-to-amps': {
    name: 'MVA to Amps Calculator',
    description:
      'Calculate current for large single-phase or balanced three-phase systems from MVA and voltage.',
    example:
      'Balanced three-phase 1 MVA, 11 kV: line current is about 52.486 A.',
  },
  'watts-to-volts': {
    name: 'Watts to Volts Calculator',
    description:
      'Calculate voltage from watts, current, phase and power factor.',
    example: 'Single-phase 1000 W, 5 A, PF 0.8: required voltage is 250 V.',
  },
  'kw-to-volts': {
    name: 'Kilowatts to Volts Calculator',
    description: 'Calculate voltage from kW, current, phase and power factor.',
    example:
      'Balanced three-phase 10 kW, 20 A, PF 0.8: line voltage is about 360.844 V.',
  },
  'va-to-watts': {
    name: 'VA to Watts Calculator',
    description: 'Convert VA apparent power to watts using power factor.',
    example: '1000 VA, PF 0.8: real power is 800 W.',
  },
  'kva-to-kw': {
    name: 'kVA to kW Calculator',
    description: 'Convert kVA to kW real power using power factor.',
    example: '10 kVA, PF 0.8: real power is 8 kW.',
  },
  'watts-to-va': {
    name: 'Watts to VA Calculator',
    description: 'Convert watts to VA apparent power using power factor.',
    example: '1000 W, PF 0.8: apparent power is 1250 VA.',
  },
  'watts-to-kva': {
    name: 'Watts to kVA Calculator',
    description: 'Convert watts to kVA using power factor.',
    example: '1000 W, PF 0.8: apparent power is 1.25 kVA.',
  },
  'kw-to-kva': {
    name: 'kW to kVA Calculator',
    description: 'Convert kW real power to kVA using power factor.',
    example: '10 kW, PF 0.8: apparent power is 12.5 kVA.',
  },
  'va-to-kva': {
    name: 'VA to kVA Calculator',
    description: 'Convert apparent-power units between VA, kVA and MVA.',
    example: '1000 VA = 1 kVA = 0.001 MVA.',
  },
  'kva-to-va': {
    name: 'kVA to VA Calculator',
    description: 'Convert apparent-power units between kVA, VA and MVA.',
    example: '1 kVA = 1000 VA = 0.001 MVA.',
  },
  'kw-to-kwh': {
    name: 'kW to kWh Calculator',
    description:
      'Calculate kWh energy from power, daily operating time and number of days.',
    example: '1 kW used for 8 hours consumes 8 kWh.',
  },
  'watts-to-kwh': {
    name: 'Watts to kWh Calculator',
    description: 'Calculate kWh energy from watts and operating time.',
    example: '1000 W used for 8 hours consumes 8 kWh.',
  },
  'kwh-to-kw': {
    name: 'kWh to kW Calculator',
    description: 'Calculate average kW from kWh energy and total time.',
    example: '10 kWh used over 5 hours is an average power of 2 kW.',
  },
  'kwh-to-watts': {
    name: 'kWh to Watts Calculator',
    description: 'Calculate average watts from kWh energy and total time.',
    example: '1 kWh used over 2 hours is an average power of 500 W.',
  },
  'energy-consumption': {
    name: 'Energy Consumption Calculator',
    description:
      'Calculate kWh, Wh and joules from W/kW/MW and operating time.',
    example: '1 kW used 8 hours a day for 30 days consumes 240 kWh.',
  },
  'electricity-cost': {
    name: 'Electricity Cost Calculator',
    description:
      'Estimate electricity cost from power, time, days and a custom price per kWh.',
    example:
      '240 kWh at 3 currency units per kWh gives an estimated cost of 720.',
  },
  'ac-power-converter': {
    name: 'AC Power Converter',
    description:
      'Convert among amps, voltage, W/kW/MW, VA/kVA/MVA and power factor.',
    example:
      'Balanced three-phase 10 kW, 380 V, PF 0.8 gives about 18.99 A line current.',
  },
  'power-factor': {
    name: 'Power Factor Calculator',
    description:
      'Calculate power factor and phase angle from real, apparent or reactive power.',
    example:
      'Real power 8 kW and apparent power 10 kVA: PF = 0.8 and reactive power = 6 kvar.',
  },
  'energy-cost': {
    name: 'Energy & Electricity Cost Calculator',
    description:
      'Calculate kWh, joules, average power and estimated cost using a custom price per kWh.',
    example:
      '1 kW used 8 hours a day for 30 days consumes 240 kWh; at 3 per kWh the estimate is 720.',
  },
  'va-to-amps': {
    name: 'VA to Amps Calculator',
    description:
      'Calculate current for single-phase or balanced three-phase loads from VA/kVA/MVA and voltage.',
    example:
      'Single-phase 1000 VA at 220 V is about 4.545 A; three-phase 10 kVA at 380 V is about 15.193 A.',
  },
  'key-derivation': {
    name: 'PBKDF2 / EvpKDF Key Derivation',
    description:
      'Derive a key from a password, salt, hash and iteration count, then output HEX or Base64.',
    example:
      'PBKDF2-HMAC-SHA256 with password, UTF-8 salt, 1 iteration and 256 bits yields the displayed public test vector.',
  },
  'byte-encoding': {
    name: 'Base64 & Text Encoding Converter',
    description:
      'Convert Base64, Base64URL, HEX, Latin1 and UTF-8/UTF-16 bytes.',
    example:
      'The UTF-8 text “中文” is 5Lit5paH in Base64 and e4b8ade69687 in HEX.',
  },
  crypto: {
    name: 'Text Encryption & Decryption',
    description:
      'Encrypt and decrypt text with AES-GCM, plus compatibility modes for AES, DES, RC4 and other legacy formats.',
    example:
      'Encrypt text with a password, send the result to the reverse operation, and decrypt it. Never reuse a test password for real sensitive data.',
  },
  hash: {
    name: 'Hash & HMAC',
    description:
      'Calculate SHA, MD5, RIPEMD-160 digests or HMAC with HEX and Base64 output.',
    example:
      'The SHA-256 digest of abc is ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.',
  },
  'password-generator': {
    name: 'Password Generator',
    description:
      'Generate random passwords, memorable phrases or PINs in the browser with custom length and characters.',
    example:
      'The default is 20 characters with upper/lowercase letters, numbers and symbols; a new password is made only when you click Generate.',
  },
  'text-repair': {
    name: 'Mojibake Repair & File Transcoding',
    description:
      'Compare repair candidates for Chinese, Japanese and Korean mojibake, then read and transcode text files.',
    example:
      'UTF-8 “中文” misread as Windows-1252 becomes “ä¸­æ–‡”; select the matching candidate to restore it.',
  },
  'battery-life': {
    name: 'Battery Runtime Estimate',
    description:
      'Estimate runtime from battery capacity, average load current and usable-capacity percentage.',
    example:
      'A 2000 mAh battery at a steady 100 mA and 100% usable capacity has an ideal runtime of 20 hours.',
  },
  'capacitor-discharge': {
    name: 'Capacitor Discharge Calculator',
    description:
      'Calculate discharge time to a target voltage, or solve for resistance and initial power.',
    example:
      'A 100 µF capacitor discharging through 10 kΩ from 24 V to 5 V takes about 1.5686 seconds in theory.',
  },
  'dbm-watts': {
    name: 'dBm & Watts Converter',
    description: 'Convert power among dBm, dBW, watts and milliwatts.',
    example: '0 dBm = 1 mW; 30 dBm = 1 W = 0 dBW.',
  },
  analog: {
    name: 'Analog Signal Scaling',
    description:
      'Linearly convert current, voltage, engineering values and percentages.',
    example:
      'For 4–20 mA mapped to 0–100, 12 mA gives 50 and corresponds to 5 V on a 0–10 V range.',
  },
  'plc-scaling': {
    name: 'PLC Raw Value Scaling',
    description:
      'Scale forward or in reverse using custom module raw and engineering ranges.',
    example:
      'For raw 0–27648 mapped to 0–100, raw 13824 gives engineering value 50.',
  },
  'base-converter': {
    name: 'Number Base Converter',
    description:
      'Convert binary, octal, decimal and hexadecimal values, including signed two’s complement.',
    example:
      'With signed 8-bit selected, HEX FF is −1 in decimal; unsigned it is 255.',
  },
  'modbus-address': {
    name: 'Modbus Address Calculator',
    description:
      'Convert among the four data areas, reference numbers and zero-based addresses.',
    example:
      'Five-digit Holding Register 40101 maps to zero-based address 100 (HEX 0064) and read function 03.',
  },
  'modbus-crc': {
    name: 'Modbus CRC-16',
    description:
      'Calculate the CRC for HEX data and show the on-wire byte order.',
    example: '01 03 00 00 00 0A has CRC CDC5 and is appended on wire as C5 CD.',
  },
  'register-converter': {
    name: 'Registers & Floating Point',
    description: 'Convert integers, float32 values and register byte orders.',
    example:
      'Float32 12.5 is 4148 0000 in ABCD order and 0000 4148 in CDAB order.',
  },
  'voltage-divider': {
    name: 'Voltage Divider Calculator',
    description:
      'Calculate output voltage and power dissipation, or solve for the required resistor.',
    example:
      'Vin = 24 V and R1 = R2 = 10000 Ω gives Vout = 12 V and current = 1.2 mA.',
  },
  electrical: {
    name: 'Voltage, Current & Power',
    description:
      'Use Ohm’s law for DC circuits and calculate single- or three-phase AC power.',
    example:
      'DC: 24 V and 120 Ω gives 0.2 A and 4.8 W. Single-phase: 220 V, 10 A, PF 0.8 gives 1760 W.',
  },
  '555-timer': {
    name: '555 Timer Calculator',
    description:
      'Calculate monostable and astable circuits, including solving backwards from a target.',
    example:
      'Astable RA = RB = 10000 Ω and C = 0.000001 F gives about 48.09 Hz and 66.67% duty cycle.',
  },
  'resistor-color': {
    name: 'Resistor Color Code',
    description:
      'Convert four- or five-band colors to resistance/tolerance and back.',
    example:
      'Four bands brown, black, red, gold = 1000 Ω ±5%, ranging from 950 to 1050 Ω.',
  },
  'resistor-network': {
    name: 'Series & Parallel Resistors',
    description:
      'Quickly calculate equivalent resistance for multiple series or parallel resistors.',
    example:
      '100, 220 and 330 Ω in series = 650 Ω; two 100 Ω resistors in parallel = 50 Ω.',
  },
  'rc-time': {
    name: 'RC Time Constant',
    description:
      'Calculate time constant and charge/discharge voltage, with a response curve.',
    example:
      'R = 10000 Ω, C = 0.0001 F and Vin = 5 V gives τ = 1 s and about 3.1606 V after charging for 1 s.',
  },
  qrcode: {
    name: 'QR Code Generator',
    description:
      'Create QR codes for text, URLs, Wi-Fi networks and contact cards.',
    example:
      'Choose Text and enter Traditional Chinese to create a QR code; Wi-Fi mode creates scanner-compatible connection data.',
  },
  big5: {
    name: 'Chinese to Big5',
    description:
      'Show per-character groups, a character table and full HEX bytes.',
    example: '“你好” groups as A741 A66E; the full bytes are A7 41 A6 6E.',
  },
  'unit-converter': {
    name: 'Engineering Unit Converter',
    description:
      'Convert common units for pressure, flow, time, mass, volume and other quantities.',
    example: '1 bar = 100 kPa; 1 L/min = 0.06 m³/h; 0 °C = 32 °F.',
  },
  'capacitor-network': {
    name: 'Series & Parallel Capacitors',
    description:
      'Calculate equivalent capacitance for multiple series or parallel capacitors with a linked circuit diagram.',
    example:
      'Two 100 nF capacitors give 50 nF in series or 200 nF in parallel.',
  },
  'smd-capacitor': {
    name: 'SMD Capacitor Codes',
    description:
      'Convert three-digit and R-decimal capacitor codes, capacitance and tolerance.',
    example: '104 = 100000 pF = 100 nF = 0.1 µF; 104K means ±10% tolerance.',
  },
  'led-resistor': {
    name: 'LED Series Resistor',
    description:
      'Calculate current-limiting resistance and power from LED count, forward voltage and target current.',
    example:
      'A 5 V supply, one 2 V LED and 20 mA target current requires 150 Ω in theory at 0.06 W.',
  },
  'smd-resistor': {
    name: 'SMD Resistor Codes',
    description:
      'Convert three-digit, four-digit, R-decimal and EIA-96 resistance codes.',
    example: '472 = 4.7 kΩ; 1001 = 1 kΩ; EIA-96 code 01A = 100 Ω.',
  },
  'current-divider': {
    name: 'Branch Current Divider',
    description:
      'Calculate current, share and power for each branch of parallel resistors.',
    example:
      'Two 100 Ω branches across 10 V each carry 0.1 A, for 0.2 A total.',
  },
  'shunt-resistor': {
    name: 'Current Shunt Calculator',
    description:
      'Calculate a shunt from voltage drop, current and resistance, or convert a measured drop to current.',
    example: 'A 100 A / 75 mV shunt is 0.75 mΩ; 37.5 mV corresponds to 50 A.',
  },
  'rc-filter': {
    name: 'RC Filter Calculator',
    description:
      'Calculate first-order low/high-pass cutoff frequency, gain, phase and frequency response.',
    example:
      'R = 10 kΩ and C = 10 nF gives a cutoff near 1591.55 Hz and −3.01 dB at cutoff.',
  },
  reactance: {
    name: 'Capacitive & Inductive Reactance',
    description:
      'Calculate reactance from capacitance, inductance and frequency in either direction, with a frequency curve.',
    example: 'At 1 kHz, a 100 nF capacitor has about 1591.55 Ω reactance.',
  },
  'lc-resonance': {
    name: 'LC Resonance',
    description:
      'Given any two of inductance, capacitance and ideal resonant frequency, calculate the third.',
    example:
      'L = 10 mH and C = 100 nF gives an ideal resonant frequency near 5032.92 Hz.',
  },
  'preferred-resistor': {
    name: 'Preferred Resistor Values',
    description:
      'Find adjacent and nearest standard E-series resistance values and their error.',
    example:
      'For an E24 target of 128 Ω, the lower value is 120 Ω, upper 130 Ω and nearest 130 Ω.',
  },
} satisfies Record<ToolSlug, EnglishToolCopy>;
