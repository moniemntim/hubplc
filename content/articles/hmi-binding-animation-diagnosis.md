---
title: HMI 綁定診斷：用固定流量重現條件與顯示故障
description: 用固定 flow 25、26、27 的離線頁重播嚴格型別、品質、模式、enable 與四種 DOM 綁定故障。
date: 2026-09-17
author: 茂伯
draft: false
category: HMI 畫面與操作
---

## 開啟固定綁定診斷頁

[開啟或另存單檔練習](/examples/binding-diagnosis/demo.html)。頁面不連 PLC、HMI runtime 或任何產品 API；它用固定 sourceFlow 25、26、27，逐筆顯示一個靜態 LED。這不是閃爍動畫案例，也沒有宣稱任何原生 binding 或 animation 已被驗證。

本例唯一條件是：

```text
isHigh = flow > 25 AND quality=Good AND mode=Auto AND enable=true
```

LED 不會為了看起來亮而略過任一 gate。診斷區永遠分開 sourceFlow、type、quality、完整 condition、bindingTarget、style class 與 visible。

## 固定步驟與預期

| 操作                          | 預期                                             |
| ----------------------------- | ------------------------------------------------ |
| 初始 flow=25                  | flow>25=false，LED LOW；25 是嚴格邊界，不是 High |
| 按一次下一筆                  | flow=26，所有 gate 合格，LED HIGH 可見           |
| 再按一次，選 string 27        | 顯示 string rejected; no auto-cast，LED LOW      |
| Reset，前進到26，選 Bad       | good=false，LED LOW；不把數字25/26當品質證據     |
| 保持26改 Manual 或取消 enable | 分別顯示 auto=false 或 enable=false，LED LOW     |

type 只接受有限 number。string 27 不做自動轉型；這避免文字資料看起來像數字時悄悄通過條件。Good、Bad、Unknown 是本頁自訂品質 enum，不能直接當成協定狀態碼。

## 把渲染故障與條件故障分開

先 Reset、前進到26，維持 Good、Auto、enable，再在「單一綁定故障」一次選一項：

| 故障               | 真正條件 | 可核對的 DOM／診斷                                               |
| ------------------ | -------- | ---------------------------------------------------------------- |
| bindingTarget 錯誤 | true     | source 數字更新到 numberText，但 indicatorActive 未更新，LED LOW |
| style class 缺失   | true     | 有 binding-high，但 CSS 需要 .led.high                           |
| parent hidden      | true     | parent 使用 hidden，指示器不顯示                                 |
| opaque overlay     | true     | 指示器仍在 DOM，但被不透明 overlay 蓋住                          |

這四種都不等於資料條件 false，也不應用移除品質、Auto 或 enable gate 的方式「修好」亮燈。Reset 會回到 flow=25、number、Good、Auto、enable、無故障，並移除遮罩。

瀏覽器檢查在320、768、1440px核對 strict 25 邊界、string27拒絕、Bad／Manual／disable、四種故障真 DOM、Reset、頁面錯誤與橫向溢位。它沒有驗證真實 PLC/HMI、動畫速度、reduced-motion、使用者偏好或裝置渲染。因本例只用靜態狀態，沒有 CSS pulse 可停用；若日後加入動畫，必須另為 prefers-reduced-motion 提供靜態表示與測試。
