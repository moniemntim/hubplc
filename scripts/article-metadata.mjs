import sanitizeHtml from 'sanitize-html';

export function plainText(html) {
  let text = '';
  const spaced = html.replace(
    /<\/(?:p|h[1-6]|li|td|th|tr|pre|div|blockquote)>|<br\s*\/?>/gi,
    '$& ',
  );
  sanitizeHtml(`<article-index-text>${spaced}</article-index-text>`, {
    allowedTags: ['article-index-text'],
    allowedAttributes: {},
    exclusiveFilter(frame) {
      if (frame.tag === 'article-index-text') text = frame.text;
      return false;
    },
  });
  return text.replace(/\s+/g, ' ').trim();
}

export function inferCategory(slug, title) {
  const value = `${slug} ${title}`.toLowerCase();
  if (
    /rs-?485|modbus|opc.?ua|mqtt|gateway|閘道|ethernet|乙太網|wireshark|vlan|rstp|multicast|交換器/.test(
      value,
    )
  )
    return '工業通訊與網路';
  if (/hmi|人機介面|儀表板/.test(value)) return 'HMI 畫面與操作';
  if (
    /csv|historian|historical|histor(y|ical)-data|報表|日報|班報|工業資料|工業記錄|資料品質|data-quality|sd-(bin|csv)|歷史資料/.test(
      value,
    )
  )
    return '資料記錄與報表';
  if (
    /24v|24 v|24.?vdc|pnp|npn|ttl|htl|乾接點|光耦|繼電器|開集極|線纜|接頭|控制箱|接地|電源|類比介面|電流迴路|共模|訊號分配|訊號隔離|signal-isolator|zero-volt|反接|tvs/.test(
      value,
    )
  )
    return '電氣介面與配線';
  if (
    /sensor|transmitter|thermocouple|rtd|strain-gauge|load-cell|感測|量測|液位|壓力|流量計|荷重元|導電度|熱電偶|濁度|ph-|infrared|紅外線|4-20ma/.test(
      value,
    ) &&
    !/plc-|scaling|縮放|查表|插值/.test(value)
  )
    return '感測器與量測';
  if (
    /maintenance|backup|handover|交接|維護|備份|電池|故障|診斷|排查|驗證|evidence|取證|diagnostic|cross-reference|crosscheck|trace|watchdog|debug|版本標籤/.test(
      value,
    )
  )
    return '維護與故障排查';
  return 'PLC 程式與控制';
}

export function articleMetadata(meta, slug, inputHtml) {
  const toc = [];
  const html = inputHtml.replace(
    /<h([23])>([\s\S]*?)<\/h\1>/g,
    (_, level, inner) => {
      const id = `section-${toc.length + 1}`;
      toc.push({ id, title: plainText(inner), level: Number(level) });
      return `<h${level} id="${id}">${inner}</h${level}>`;
    },
  );
  const text = plainText(html);
  const chinese = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = text.match(/[a-z0-9]+/gi)?.length ?? 0;
  const readingMinutes = Math.max(1, Math.ceil(chinese / 450 + words / 220));
  const category = meta.category?.trim() || inferCategory(slug, meta.title);
  const tagRules = [
    ['RS485', /rs-?485/i],
    ['Modbus', /modbus/i],
    ['OPC UA', /opc.?ua/i],
    ['MQTT', /mqtt/i],
    ['HMI', /hmi/i],
    ['CSV', /csv/i],
    ['FX5U', /fx5u/i],
    ['Q 系列', /q-series|q06|q 系列|q系列/i],
    ['GX Works2', /gx.?works2/i],
    ['24 VDC', /24.?v(?:dc)?/i],
    ['類比訊號', /analog|類比|4-20ma/i],
    ['計時器', /timer|計時器/i],
    ['狀態機', /state-machine|狀態機/i],
  ];
  const tags = meta.tags
    ? [
        ...new Set(
          meta.tags
            .split(/[,，、]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ].slice(0, 10)
    : tagRules
        .filter(([, rule]) => rule.test(`${slug} ${meta.title}`))
        .map(([tag]) => tag);
  return { html, text, toc, readingMinutes, category, tags };
}
