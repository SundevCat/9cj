import Link from "next/link";

type Section = {
  id: string;
  title: string;
  subtitle: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "ภาพรวมระบบ",
    subtitle: "9CJ Corp คืออะไร",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          9CJ Corp คือ <span className="text-accent-blue">Personal AI Operating System</span> — แดชบอร์ดส่วนตัวที่รวมเครื่องมือ
          การเทรด การเงิน สมาร์ทโฮม และ DevOps ไว้ในที่เดียว ทำงานบน <code className="text-ink">localhost:3000</code> ของเครื่องคุณ
          เก็บข้อมูลใน PostgreSQL (Docker) ทั้งหมด
        </p>
        <p>
          ระบบมี <span className="text-accent-amber">11 โมดูล</span> ที่ทำงานร่วมกัน เชื่อมต่อกับ Capital.com สำหรับเทรดทอง (XAU/USD)
          ทั้งแบบ manual และอัตโนมัติ ผ่านระบบกฎ (Policy) + การอนุมัติของมนุษย์ (Human-in-Loop)
        </p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li>เทรดทองคำผ่าน Capital.com (บัญชี Demo หรือ Live)</li>
          <li>คำนวณสัญญาณ RSI / MACD / EMA แบบ real-time</li>
          <li>มี Auto-Trader ที่ทำงานตามสัญญาณ Consensus</li>
          <li>ติดตามรายรับ-รายจ่าย, งบประมาณ, พอร์ตการลงทุน</li>
          <li>ควบคุมอุปกรณ์สมาร์ทโฮมผ่าน Home Assistant</li>
          <li>มี Kanban board สำหรับจัดการงาน</li>
          <li>มอนิเตอร์สถานะเซิร์ฟเวอร์ + log การ deploy</li>
          <li>บันทึกทุกการตัดสินใจของ AI ลง Memory Audit</li>
        </ul>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    subtitle: "หน้าหลัก · /",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>หน้าแรกของแอป รวมข้อมูลสำคัญที่ <span className="text-accent-blue">อัปเดตแบบ live ทุก 5 วินาที</span> ผ่าน SSE stream:</p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li><span className="text-ink">XAU / USD</span> — ราคาทองล่าสุดและการเปลี่ยนแปลง</li>
          <li><span className="text-ink">Stream Health</span> — สถานะการเชื่อมต่อ SSE (ONLINE / OFFLINE)</li>
          <li><span className="text-ink">Open Approvals</span> — จำนวนงานที่รออนุมัติ</li>
          <li><span className="text-ink">Services Healthy</span> — สถานะ uptime ของบริการที่ติดตาม</li>
          <li><span className="text-ink">Modules grid</span> — ทางลัดไปแต่ละโมดูล</li>
          <li><span className="text-ink">Agent Activity</span> — feed กิจกรรมล่าสุดของ agent ทั้งหมด</li>
        </ul>
        <Tip>
          แค่เปิดหน้านี้ทิ้งไว้ในเบราว์เซอร์ก็เพียงพอให้ SSE stream + Auto-Trader ทำงาน
          ถ้าปิด tab ทั้งหมด ระบบจะหยุด ticking
        </Tip>
      </div>
    ),
  },
  {
    id: "briefing",
    title: "Daily Briefing",
    subtitle: "สรุปประจำวัน · /briefing",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          หน้านี้รวบรวมสรุปจากทุกโมดูลไว้ในการ์ดเดียว — เหมาะสำหรับดูตอนเช้าก่อนเริ่มทำงาน
        </p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li>ราคาทองและสัญญาณ RSI / MACD / EMA ปัจจุบัน</li>
          <li>กำไร-ขาดทุนจากการเทรดของวันก่อนและวันนี้</li>
          <li>รายรับ-รายจ่ายของเมื่อวาน + งบประมาณที่ใกล้เต็ม</li>
          <li>3 งานที่มีลำดับความสำคัญสูงสุดในคิว</li>
          <li>จำนวน approval ที่รออยู่</li>
          <li>สถานะ services healthy</li>
        </ul>
        <p>กดปุ่ม <span className="text-accent-blue">refresh briefing</span> เพื่ออัปเดตข้อมูลใหม่</p>
      </div>
    ),
  },
  {
    id: "agents",
    title: "AI Agents",
    subtitle: "Task queue + module router · /agents",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          จัดการคิวงานที่ AI agent ต้องทำ พร้อมระดับความสำคัญ (HIGH / MEDIUM / LOW)
          และ module ที่จะรับผิดชอบงานนั้น (xau, finance, home-ops, ฯลฯ)
        </p>
        <p className="font-semibold text-ink">วิธีใช้:</p>
        <ol className="flex flex-col gap-1 pl-4 list-decimal text-ink-muted">
          <li>กรอกชื่องานในช่อง <span className="text-ink">Title</span></li>
          <li>เลือก <span className="text-ink">Module</span> ที่จะรับงาน</li>
          <li>เลือก <span className="text-ink">Priority</span></li>
          <li>กด <span className="text-accent-green">queue task</span></li>
        </ol>
        <p>
          ปุ่ม <span className="text-accent-purple">LOAD DEMO</span> จะโหลด policies + kanban + memories ตัวอย่าง
          เพื่อให้เห็นว่าหน้าตาเต็มๆ เป็นยังไง
        </p>
      </div>
    ),
  },
  {
    id: "xau",
    title: "Quant XAU Desk",
    subtitle: "หน้าเทรดทอง + Auto-Trader · /xau",
    body: (
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        <p className="text-accent-amber">นี่คือหน้าหลักของระบบเทรดทอง — มี 5 ส่วน</p>

        <div>
          <div className="mono text-xs uppercase tracking-widest text-ink-dim mb-1">1. Price Ticker</div>
          <p className="text-ink-muted">
            แสดงราคาทอง XAU/USD จาก Capital.com แบบ bid/ask (ถ้าตั้งค่า broker เรียบร้อย)
            อัปเดตทุก 30 วินาที ถ้า Capital ใช้ไม่ได้ จะ fallback ไป gold-api.com
          </p>
        </div>

        <div>
          <div className="mono text-xs uppercase tracking-widest text-ink-dim mb-1">2. Signal Dashboard</div>
          <p className="text-ink-muted">
            แสดงค่า RSI(14), MACD(12,26,9), และ EMA 50/200 พร้อมป้าย <span className="text-accent-green">BUY</span> /{" "}
            <span className="text-accent-red">SELL</span> / <span className="text-accent-amber">NEUTRAL</span>
          </p>
          <p className="text-[12px] text-ink-muted mt-2">
            <span className="text-accent-amber">หมายเหตุ:</span> RSI ใช้แบบ <span className="text-ink">momentum</span> ไม่ใช่ mean-reversion มาตรฐาน
            — RSI <span className="text-ink">&lt; 30 = SELL</span> (ตลาดร่วงแรง, ไปตามเทรนด์ลง) ·{" "}
            RSI <span className="text-ink">&gt; 70 = BUY</span> (ตลาดขึ้นแรง, ไปตามเทรนด์ขึ้น)
            ตรงข้ามกับตำราของ Wilder
          </p>
        </div>

        <div>
          <div className="mono text-xs uppercase tracking-widest text-ink-dim mb-1">3. Candlestick Chart</div>
          <p className="text-ink-muted">
            กราฟแท่งเทียนจาก <span className="text-accent-green">Capital.com</span> (real OHLCV) — ถ้า Capital ใช้ไม่ได้ จะ fallback เป็น synthetic random walk
          </p>
          <p className="text-ink-muted mt-1">
            <span className="text-ink">Timeframe picker</span> มุมขวาบน — เลือกได้ 1m / 5m / 15m / 30m / 1h / 4h / 1D / 1W
          </p>
          <p className="text-ink-muted mt-1">
            <span className="text-ink">↻ reseed button</span> มุมขวาบน — กดเมื่อกราฟว่างหรือดูผิดปกติ
            จะ wipe Price table + โหลด candles ใหม่จาก Capital (ใช้แทนการรัน curl ใน terminal)
          </p>
          <Tip>
            ถ้ากราฟแสดง overlay กลางจอ &quot;Chart is empty — needs reseed&quot; ให้กดปุ่ม <span className="text-accent-purple">↻ Reseed candles</span> ตรงกลาง
          </Tip>
          <p className="text-[12px] text-ink-muted mt-1">
            ดูที่ subtitle เหนือกราฟเพื่อตรวจ source:{" "}
            <span className="text-accent-green">Capital.com real OHLCV</span> = ข้อมูลจริง ·{" "}
            <span className="text-accent-amber">local cache</span> = mix ของ seed + SSE ticks
          </p>
        </div>

        <div>
          <div className="mono text-xs uppercase tracking-widest text-ink-purple mb-1">4. Auto-Trader 🤖</div>
          <p className="text-ink-muted mb-2">
            บอทเทรดอัตโนมัติ — มี 2 strategy + ปุ่ม manual trigger
          </p>
          <p className="font-semibold text-ink mb-1">เลือก Strategy:</p>
          <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted mb-2">
            <li>
              <span className="text-ink">CONSENSUS (3/3)</span> — RSI + MACD + EMA <em>ทั้ง 3 ตัว</em> ต้องเห็นพ้องกัน · strict · เทรดน้อย (default)
            </li>
            <li>
              <span className="text-ink">MAJORITY (2/3)</span> — แค่ 2 ใน 3 เห็นพ้องกัน (ห้ามมีตัวที่ 3 ขัด) · moderate · เทรดบ่อยขึ้น (เหมาะสำหรับทดสอบ)
            </li>
          </ul>
          <p className="font-semibold text-ink mb-1">วิธีเปิดใช้:</p>
          <ol className="flex flex-col gap-1 pl-4 list-decimal text-ink-muted">
            <li>เลือก <span className="text-ink">Strategy</span> จาก dropdown</li>
            <li>
              ตั้ง <span className="text-ink">Size</span> — ระวัง! Capital GOLD CFD = 1 contract = 100 oz
              <br />
              <span className="text-accent-amber text-[11px]">
                แนะนำเริ่มที่ <code className="text-ink">0.01</code> (= 1 oz, ประมาณ $45)
              </span>
            </li>
            <li>
              <span className="text-ink">Stop-Loss %</span> — เช่น 0.3 = ปิดออเดอร์เมื่อขาดทุน 0.3%
            </li>
            <li>
              <span className="text-ink">Take-Profit %</span> — เช่น 1.0 = ปิดเมื่อกำไร 1%
            </li>
            <li>
              <span className="text-ink">Cooldown (sec)</span> — ระยะเวลาขั้นต่ำระหว่างการเทรด (default 30s)
            </li>
            <li>กด <span className="text-accent-purple">save params</span></li>
            <li>กด <span className="text-accent-green">○ OFF</span> เพื่อเปิด → จะมี confirmation popup</li>
          </ol>
          <div className="mt-3 bg-accent-amber/10 border border-accent-amber/30 rounded p-3">
            <p className="font-semibold text-accent-amber mb-2">เกี่ยวกับ SHORT — TP &amp; SL เซ็ตยังไง</p>
            <p className="text-ink-muted mb-2">
              SHORT = ขายก่อนแล้วซื้อคืนทีหลัง — ดังนั้น <span className="text-ink">profit เกิดเมื่อราคา <em>ลง</em></span>
              ทำให้ TP ของ SHORT อยู่ <span className="text-ink">ต่ำกว่า</span> entry — <em>ถูกแล้ว ไม่ใช่ bug</em>
            </p>
            <table className="w-full text-[12px] mt-2">
              <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim">
                <tr><th className="text-left py-1">ทิศทาง</th><th className="text-left py-1">SL (loss)</th><th className="text-left py-1">TP (profit)</th></tr>
              </thead>
              <tbody className="mono text-ink-muted">
                <tr><td className="py-1 text-accent-green">LONG</td><td>ต่ำกว่า entry</td><td>สูงกว่า entry</td></tr>
                <tr><td className="py-1 text-accent-red">SHORT</td><td>สูงกว่า entry</td><td>ต่ำกว่า entry</td></tr>
              </tbody>
            </table>
            <p className="text-[11px] text-ink-dim mt-2">
              ตัวอย่าง: SHORT entry 4500 · SL% 0.3 · TP% 1.0 → <span className="text-accent-red">SL 4513.50 (+0.30%)</span>{" "}
              · <span className="text-accent-green">TP 4455.00 (−1.00%)</span>
            </p>
          </div>
          <p className="font-semibold text-ink mb-1 mt-3">↯ Trade now — manual trigger:</p>
          <p className="text-ink-muted">
            ปุ่มสีอำพัน + LONG/SHORT toggle ทางขวาของ panel — กดเพื่อสั่งเทรดทันที{" "}
            <span className="text-accent-amber">โดยไม่สนใจ signal หรือ cooldown</span> (ยังต้องผ่าน policy เหมือนเดิม)
          </p>
          <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted mt-1">
            <li>ใช้สำหรับ <span className="text-accent-amber">ทดสอบ</span> pipeline (open → broker → DB → memory → UI) ใน 5 วินาที</li>
            <li>ถ้ามี position ทิศตรงข้ามอยู่ จะ flip ให้ (ปิดเก่า + เปิดใหม่ใน call เดียว)</li>
            <li>ถ้ามี position ทิศเดียวกันอยู่แล้ว จะ refuse (ไม่ stack)</li>
          </ul>
          <Tip>
            อยากเห็นบอทเทรดบ่อยๆ เพื่อ test pipeline? เลือก <span className="text-ink">MAJORITY (2/3)</span> + กด <span className="text-accent-amber">↯ Trade now</span>
            ครั้งแรกเพื่อยืนยันว่าทุกอย่างทำงาน
          </Tip>
          <p className="text-[12px] text-ink-muted mt-2">
            ดูรายละเอียดการทำงานของบอท + flow diagram ได้ที่ section{" "}
            <a href="#auto-trader-flow" className="text-accent-purple underline">การทำงานของบอท (Flow)</a>
          </p>
        </div>

        <div>
          <div className="mono text-xs uppercase tracking-widest text-ink-dim mb-1">5. Trade Journal</div>
          <p className="text-ink-muted">
            ตารางบันทึกการเทรด ทั้งแบบ <span className="text-ink">manual</span> (กรอกเอง) และ <span className="text-ink">live</span> (สั่งผ่าน Capital)
          </p>
          <p className="text-ink-muted mt-1">
            ฟอร์ม <span className="text-ink">Log Trade</span> มีปุ่ม <span className="text-accent-red">⚠ LIVE MODE</span> — ถ้าติ๊ก จะส่งออเดอร์จริงไปที่ Capital
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "auto-trader-flow",
    title: "การทำงานของบอท (Flow)",
    subtitle: "Auto-Trader · decision flow + architecture",
    body: <AutoTraderFlow />,
  },
  {
    id: "backtest",
    title: "Backtest Lab",
    subtitle: "ทดสอบกลยุทธ์ย้อนหลัง · /backtest",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          ทดสอบกลยุทธ์ RSI / MACD / EMA crossover บน OHLCV ย้อนหลัง — ไม่ต้องใช้ broker
        </p>
        <p className="font-semibold text-ink">วิธีใช้:</p>
        <ol className="flex flex-col gap-1 pl-4 list-decimal text-ink-muted">
          <li>เลือก strategy (RSI / MACD / EMA Cross)</li>
          <li>เลือก data source: <span className="text-ink">Stored</span> (ใช้ candles ใน DB) หรือ <span className="text-ink">CSV</span> (อัปโหลดไฟล์)</li>
          <li>ตั้ง <span className="text-ink">Starting Equity</span> — default $10,000</li>
          <li>กด <span className="text-accent-purple">run backtest</span></li>
        </ol>
        <p>ผลลัพธ์: <span className="text-ink">total trades</span>, <span className="text-ink">win rate</span>, <span className="text-ink">P&amp;L</span>, <span className="text-ink">Sharpe ratio</span>, <span className="text-ink">max drawdown</span>, equity curve, ตารางทุก trade</p>
      </div>
    ),
  },
  {
    id: "finance",
    title: "Finance / P&L",
    subtitle: "การเงินส่วนตัว · /finance",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>ติดตามรายรับ-รายจ่าย, งบประมาณ, พอร์ตการลงทุน — สกุลเงินเริ่มต้น THB (฿)</p>
        <p className="font-semibold text-ink">ส่วนประกอบ:</p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li><span className="text-ink">Stats cards</span>: Net Worth, Trading P&amp;L, Monthly Burn, Savings Rate</li>
          <li><span className="text-ink">Import CSV</span>: คอลัมน์ <code className="text-ink">date,description,amount[,category]</code> — amount ติดลบ = expense</li>
          <li><span className="text-ink">Load Demo Data</span>: โหลดตัวอย่าง 52 entries ย้อนหลัง 4 เดือน</li>
          <li><span className="text-ink">Portfolio</span>: สัดส่วน CASH / XAU / EQUITIES / CRYPTO</li>
          <li><span className="text-ink">Monthly P&amp;L chart</span>: bar chart 12 เดือนล่าสุด</li>
          <li><span className="text-ink">Budget Utilization</span>: เปอร์เซ็นต์ที่ใช้ไปต่องบประมาณ</li>
        </ul>
        <Tip>
          ระบบ categorizer จะเดา category อัตโนมัติจากคำใน description (เช่น &quot;openai&quot; → saas, &quot;rent&quot; → housing, &quot;grab&quot; → transport)
        </Tip>
      </div>
    ),
  },
  {
    id: "home-ops",
    title: "Smart Home Ops",
    subtitle: "ควบคุมอุปกรณ์ในบ้าน · /home-ops",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          เชื่อมต่อ Home Assistant local API ถ้ายังไม่ได้ตั้งค่า จะแสดง <span className="text-accent-amber">mock fleet</span> 11 อุปกรณ์ตัวอย่าง
        </p>
        <p className="font-semibold text-ink">วิธีใช้:</p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li><span className="text-ink">Home Mode</span>: สลับโหมด WORK / HOME / AWAY / SLEEP — เก็บใน Setting table</li>
          <li><span className="text-ink">Energy</span>: kWh ที่ใช้วันนี้เทียบกับค่าเฉลี่ย 7 วัน</li>
          <li><span className="text-ink">Device Grid</span>: จัดกลุ่มตาม domain (light, switch, climate, sensor) — คลิกเพื่อ toggle</li>
        </ul>
        <Tip>
          ถ้าต้องการใช้กับ Home Assistant จริง ตั้ง <code className="text-ink">HOME_ASSISTANT_URL</code> และ <code className="text-ink">HOME_ASSISTANT_TOKEN</code> ใน .env แล้วรีสตาร์ทเซิร์ฟเวอร์
        </Tip>
      </div>
    ),
  },
  {
    id: "product-ops",
    title: "ProductOps Kanban",
    subtitle: "บอร์ดงาน drag &amp; drop · /product-ops",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>Kanban board 4 คอลัมน์: <span className="text-ink">Backlog → In Progress → Review → Done</span></p>
        <p className="font-semibold text-ink">วิธีใช้:</p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li>กด <span className="text-ink">+ add</span> ที่ด้านบนของคอลัมน์เพื่อเพิ่ม card ใหม่</li>
          <li>ใส่ <span className="text-ink">title</span>, เลือก <span className="text-ink">priority</span>, เลือก <span className="text-ink">tag</span></li>
          <li>ลาก card ข้าม column ได้ ตำแหน่งจะถูกบันทึกอัตโนมัติ</li>
          <li>กด <span className="text-accent-red">✕</span> มุมขวาเพื่อลบ</li>
        </ul>
      </div>
    ),
  },
  {
    id: "devops",
    title: "DevOps Uptime",
    subtitle: "มอนิเตอร์เซิร์ฟเวอร์ · /devops",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>ping URL ที่ลงทะเบียนไว้ เพื่อเช็คสถานะ uptime + latency</p>
        <p className="font-semibold text-ink">วิธีใช้:</p>
        <ol className="flex flex-col gap-1 pl-4 list-decimal text-ink-muted">
          <li>เพิ่ม service ใหม่ในฟอร์ม <span className="text-ink">Add Service</span> (ใส่ name + URL)</li>
          <li>กดปุ่ม <span className="text-accent-blue">CHECK ALL</span> เพื่อ ping ทุก service พร้อมกัน</li>
          <li>ดู status (OK/ERR), latency, uptime %, sparkline 30 ครั้งล่าสุด</li>
          <li>บันทึก deploy notes ในฟอร์ม <span className="text-ink">Log Deploy</span></li>
        </ol>
      </div>
    ),
  },
  {
    id: "memory",
    title: "Memory / Audit",
    subtitle: "log ทุกการตัดสินใจของ AI · /memory",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          ทุกการตัดสินใจของ agent (รวมถึง Auto-Trader, policy guard, router) จะถูกบันทึกที่นี่
          พร้อม timestamp, agent name, tag (TRADE / POLICY / AI / SYS / OK / WARN / ERR), message, metadata
        </p>
        <p className="font-semibold text-ink">ฟีเจอร์:</p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li>ค้นหาแบบ full-text ใน message / agent / metadata</li>
          <li>กรองตาม tag (คลิก pill ด้านล่าง)</li>
          <li>กรองตาม agent (dropdown)</li>
          <li>Live feed เรียงจากใหม่สุด</li>
        </ul>
        <Tip>
          ถ้าอยากเข้าใจว่าทำไม Auto-Trader ตัดสินใจแบบนั้น ดูที่นี่ — agent ชื่อ <code className="text-ink">autotrader</code> จะเขียน decision ทุก 5 วินาที
        </Tip>
      </div>
    ),
  },
  {
    id: "policy",
    title: "Policy Governance",
    subtitle: "กฎควบคุม + violation log · /policy",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          ตั้งกฎที่ <span className="text-accent-red">block</span> หรือ <span className="text-accent-amber">warn</span> ก่อนที่ action อันตรายจะเกิด
        </p>
        <p className="font-semibold text-ink">Rule types:</p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li><code className="text-ink">MAX_TRADE_SIZE</code> — block trade ที่ใหญ่เกิน threshold</li>
          <li><code className="text-ink">DAILY_LOSS</code> — block trade ใหม่หลังขาดทุนเกิน threshold ในวัน</li>
          <li><code className="text-ink">SPEND_LIMIT</code> — warn เมื่อ expense รายการเดียวเกิน threshold</li>
          <li><code className="text-ink">DEVICE_QUOTA</code> — warn เมื่อ toggle อุปกรณ์เกินจำนวนต่อชั่วโมง</li>
        </ul>
        <p>
          ถ้า policy ระดับ HIGH ถูกละเมิด action นั้นจะถูกส่งเข้า <Link href="/approvals" className="text-accent-blue underline">Human-in-Loop queue</Link> แทนที่จะทำทันที
        </p>
      </div>
    ),
  },
  {
    id: "approvals",
    title: "Human-in-Loop",
    subtitle: "อนุมัติ action ที่ถูก policy block · /approvals",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          เมื่อ action ใดถูก policy HIGH-severity block (เช่น Auto-Trader สั่งเทรดเกิน <code className="text-ink">MAX_TRADE_SIZE</code>)
          action นั้นจะมาอยู่ในคิวนี้ รอให้คุณตัดสินใจ
        </p>
        <p className="font-semibold text-ink">วิธีใช้:</p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li>ดูรายละเอียด: timestamp, module, action, &quot;Why it&apos;s flagged&quot; (เหตุผลที่ policy block)</li>
          <li>กด <span className="text-accent-green">Approve</span> เพื่ออนุมัติ — violation จะถูก mark resolved</li>
          <li>กด <span className="text-accent-red">Reject</span> เพื่อปฏิเสธ</li>
          <li>ดูประวัติการอนุมัติในตาราง History ด้านล่าง</li>
        </ul>
      </div>
    ),
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "ตั้งค่าทั่วไป · /settings",
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <ul className="flex flex-col gap-1 pl-4 list-disc text-ink-muted">
          <li><span className="text-ink">Appearance</span>: สลับ Dark / Light theme (Dark คือ primary mode)</li>
          <li><span className="text-ink">Demo Data</span>: 4 ปุ่มสำหรับโหลด demo ของแต่ละ module</li>
          <li><span className="text-ink">Live Trading Broker</span>: แสดงสถานะ Capital.com (READY / INCOMPLETE)</li>
          <li><span className="text-ink">Integrations</span>: เก็บ Home Assistant URL/token + Claude API key</li>
          <li><span className="text-ink">Stored Settings</span>: ดู raw JSON ของทุก setting ที่บันทึกใน DB</li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq",
    title: "คำถามที่พบบ่อย (FAQ)",
    subtitle: "ปัญหาที่เจอบ่อย + วิธีแก้",
    body: (
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        <Faq q="กราฟไม่ขึ้น candle เลย">
          กดปุ่ม <span className="text-accent-purple">↻ reseed</span> มุมขวาบนของ chart{" "}
          (หรือถ้ามี overlay กลางจอ กด <span className="text-accent-purple">↻ Reseed candles</span> ตัวใหญ่)
          — ระบบจะ wipe Price table + โหลด real OHLCV ใหม่จาก Capital
        </Faq>
        <Faq q="กราฟแสดงแบบไม่จริง (สังเคราะห์)">
          ดูที่ subtitle เหนือ chart:
          <ul className="pl-4 list-disc mt-1 text-ink-muted">
            <li><span className="text-accent-green">Capital.com real OHLCV</span> = ข้อมูลจริง</li>
            <li><span className="text-accent-amber">synthetic</span> = สุ่ม (Capital ใช้ไม่ได้) — กด ↻ reseed อีกครั้งเมื่อ Capital กลับมา</li>
          </ul>
          เลือก timeframe อื่น (5m / 15m / 1h ฯลฯ) จะ fetch จาก Capital สดทุกครั้ง
        </Faq>
        <Faq q="Auto-Trader เปิดแล้วแต่ไม่เทรด">
          ดูบรรทัด <span className="text-ink">Last decision</span> ที่ panel:
          <ul className="pl-4 list-disc mt-1 text-ink-muted">
            <li><code className="text-ink">not enough candles</code> → กด ↻ reseed</li>
            <li><code className="text-ink">no consensus signal</code> → รอ signal (เปลี่ยน strategy เป็น MAJORITY 2/3 จะเร็วขึ้น)</li>
            <li><code className="text-ink">no majority_2of3 signal</code> → รอ signal เช่นเดียวกัน</li>
            <li><code className="text-ink">cooldown · Ns left</code> → รอ cooldown ผ่านไป</li>
            <li><code className="text-ink">tick error</code> → ดู console เซิร์ฟเวอร์ — มัก Capital API ล่ม / rate limit</li>
          </ul>
          ถ้าอยากเห็นบอทเทรดทันที กดปุ่ม <span className="text-accent-amber">↯ Trade now</span> ที่ panel
        </Faq>
        <Faq q="Capital.com Demo signup แล้วใช้ไม่ได้">
          ตรวจ 3 อย่างใน <code className="text-ink">.env</code>:
          <ol className="pl-4 list-decimal mt-1 text-ink-muted">
            <li><code className="text-ink">CAPITAL_API_KEY</code> — ได้จาก Settings → API integrations → Generate</li>
            <li><code className="text-ink">CAPITAL_EMAIL</code> — email ที่ login</li>
            <li>
              <code className="text-ink">CAPITAL_API_PASSWORD</code> — <span className="text-accent-amber">password คนละตัวกับ login!</span>
              ต้องตั้ง custom API password แยกในหน้า API integrations
            </li>
          </ol>
          แล้วรีสตาร์ท <code className="text-ink">npm run dev</code>
        </Faq>
        <Faq q="ปิด browser แล้ว Auto-Trader หยุดทำงาน">
          ใช่ — SSE stream ทำงานเฉพาะเมื่อมี client connect อยู่ ต้องเปิด tab ทิ้งไว้
          (tab ไหนก็ได้บน localhost:3000)
        </Faq>
        <Faq q="ราคา XAU ดูแปลก / กระโดด">
          มี 3 source ตามลำดับ: Capital.com → gold-api.com → synthetic random walk
          ถ้า fallback ไป synthetic ราคาจะเดินสุ่ม — ดูที่ <span className="text-ink">Price Ticker</span> ว่าใช้ source ไหน
        </Faq>
        <Faq q="อยากให้ Auto-Trader เทรดบ่อยขึ้น">
          มี 3 วิธี:
          <ol className="pl-4 list-decimal mt-1 text-ink-muted">
            <li>
              สลับ Strategy เป็น <code className="text-ink">MAJORITY (2/3)</code> — แค่ 2 ใน 3 indicator เห็นพ้องก็พอ เทรดบ่อยกว่า CONSENSUS หลายเท่า
            </li>
            <li>
              ลด <code className="text-ink">Cooldown</code> — default 30s ลดเป็น 10s ก็ได้ (อย่าลดต่ำกว่านี้เดี๋ยว whipsaw)
            </li>
            <li>
              ใช้ <span className="text-accent-amber">↯ Trade now</span> — manual trigger สำหรับเทสต์ทันที (เลือก LONG/SHORT ก่อนกด)
            </li>
          </ol>
        </Faq>
        <Faq q="↯ Trade now ต่างกับ tick() ของ Auto-Trader ยังไง">
          <ul className="pl-4 list-disc mt-1 text-ink-muted">
            <li><span className="text-ink">tick()</span> รันทุก 5 วินาที + ดู signal + เคารพ cooldown</li>
            <li><span className="text-ink">↯ Trade now</span> สั่งทันที + ไม่ดู signal + ไม่ดู cooldown</li>
            <li>ทั้ง 2 อย่างยังต้องผ่าน <span className="text-accent-purple">policy guard</span> เหมือนกัน (MAX_TRADE_SIZE, DAILY_LOSS)</li>
          </ul>
          ใช้ ↯ Trade now เพื่อยืนยันว่า pipeline ทำงาน (broker → DB → memory → UI) โดยไม่ต้องรอ signal
        </Faq>
        <Faq q="เปลี่ยน DB จาก Postgres กลับเป็น SQLite ได้ไหม">
          ทำได้ แต่ต้อง migrate schema กลับ — ตอนนี้หลาย route ใช้ Postgres-native JSON column ที่ SQLite ไม่รองรับ
          แนะนำคงไว้เป็น Postgres
        </Faq>
        <Faq q="ระบบเก็บข้อมูลที่ไหน">
          PostgreSQL ใน Docker (<code className="text-ink">postgresql://9cj:9cj_secret@localhost:5432/9cj_db</code>)
          ดูข้อมูลผ่าน <code className="text-ink">npx prisma studio</code> ที่ <code className="text-ink">localhost:5555</code>
        </Faq>
      </div>
    ),
  },
];

export function ManualPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Table of contents */}
      <div className="panel p-4 flex flex-col gap-3">
        <div className="display text-sm font-semibold">สารบัญ · Table of Contents</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {SECTIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="mono text-[11px] text-ink-muted hover:text-accent-blue px-2 py-1.5 rounded border border-line hover:border-accent-blue/40 transition-colors truncate"
            >
              {String(i + 1).padStart(2, "0")} · {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className="panel p-6 flex flex-col gap-4 scroll-mt-20"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="display text-2xl font-bold tracking-tight">{s.title}</h2>
              <p className="mono text-[11px] text-ink-muted mt-1 uppercase tracking-widest">
                {s.subtitle}
              </p>
            </div>
            <span className="mono text-[10px] uppercase tracking-widest text-ink-dim px-2 py-1 rounded bg-bg-raised border border-line">
              §{String(i + 1).padStart(2, "0")}
            </span>
          </header>
          <div className="text-ink">{s.body}</div>
        </section>
      ))}

      {/* Footer */}
      <div className="panel p-4 text-center">
        <p className="mono text-[11px] text-ink-dim">
          จบคู่มือ · ถ้ามีคำถามเพิ่มเติม ถามได้เลย
        </p>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-accent-blue/10 border border-accent-blue/30 rounded p-3 flex gap-2">
      <span className="mono text-[10px] uppercase tracking-widest text-accent-blue shrink-0 pt-0.5">
        💡 TIP
      </span>
      <div className="text-ink-muted text-sm">{children}</div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-raised/60 rounded p-3 flex flex-col gap-1">
      <div className="mono text-xs text-accent-amber">Q: {q}</div>
      <div className="text-ink-muted text-sm pl-2 border-l-2 border-line">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Trader deep-dive: architecture diagram + decision flow + timeline
// ─────────────────────────────────────────────────────────────────────────────

function AutoTraderFlow() {
  return (
    <div className="flex flex-col gap-6 text-sm leading-relaxed">
      <div>
        <p className="text-accent-purple font-semibold mb-2">บอททำงานยังไง — แบบสั้น</p>
        <p className="text-ink-muted">
          ทุก 5 วินาที (ตาม SSE pulse) บอทจะดึง 250 แท่งล่าสุดจาก DB คำนวณ RSI/MACD/EMA
          เช็ค <span className="text-ink">signal ตาม strategy ที่เลือก</span>{" "}
          (CONSENSUS = ทั้ง 3 เห็นพ้อง หรือ MAJORITY_2OF3 = 2 ใน 3 เห็นพ้อง)
          ถ้าได้ signal → เปิดออเดอร์ (หรือ flip ถ้ามีออเดอร์ตรงข้ามอยู่)
          ถ้าไม่ได้ → รอ ทุกขั้นตอนผ่าน policy guard ก่อน — กฎที่ละเมิดจะถูกส่งไปคิว HIL ให้คน approve
        </p>
        <p className="text-ink-muted mt-2">
          นอกจากนี้มี <span className="text-accent-amber">↯ Trade now</span> เป็น manual trigger —
          กดเพื่อเปิดออเดอร์ทันทีโดยไม่สนใจ signal/cooldown แต่ยังผ่าน policy เหมือนเดิม
        </p>
      </div>

      {/* Architecture diagram */}
      <div>
        <h3 className="display text-base font-semibold mb-2">Architecture · ใครเรียกใคร</h3>
        <ArchitectureDiagram />
        <p className="text-[12px] text-ink-dim mt-2">
          SSE stream เป็น heartbeat กลาง — เมื่อ browser tab เปิด stream จะรันทุก 5 วินาที
          และทุก pulse จะเรียก <code className="text-ink">autoTrader.tick()</code>
        </p>
      </div>

      {/* Decision flow */}
      <div>
        <h3 className="display text-base font-semibold mb-2">Decision Flow · บอทตัดสินใจยังไง</h3>
        <DecisionFlow />
      </div>

      {/* Outcomes table */}
      <div>
        <h3 className="display text-base font-semibold mb-2">ผลลัพธ์ที่เป็นไปได้ (TickResult.action)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/40">
              <tr>
                <th className="text-left px-3 py-2 font-normal">Action</th>
                <th className="text-left px-3 py-2 font-normal">เกิดเมื่อ</th>
                <th className="text-left px-3 py-2 font-normal">โดน toast แจ้งเตือนไหม</th>
              </tr>
            </thead>
            <tbody>
              <ActionRow action="NONE"   tone="text-ink-dim"      when="บอทถูกปิด (enabled=false)" toast="ไม่" />
              <ActionRow action="HOLD"   tone="text-ink-muted"    when="ยังคูลดาวน์ / ไม่มี signal / ตำแหน่งตรงกับสัญญาณอยู่แล้ว / Trade now กับทิศเดียวกัน" toast="ไม่" />
              <ActionRow action="OPEN"   tone="text-accent-green" when="ไม่มี position + signal actionable (หรือ ↯ Trade now ครั้งแรก) → เปิดใหม่" toast="ใช่ · severity MEDIUM" />
              <ActionRow action="FLIP"   tone="text-accent-amber" when="มี position ทิศตรงข้าม → ปิด+เปิดตรงข้าม (จาก tick หรือ Trade now)" toast="ใช่ · severity MEDIUM" />
              <ActionRow action="QUEUED" tone="text-accent-purple" when="Policy block (เช่นเกิน MAX_TRADE_SIZE) → ส่ง HIL queue" toast="ใช่ · severity HIGH" />
              <ActionRow action="ERROR"  tone="text-accent-red"   when="Capital API error / network / config ขาด" toast="ใช่ · severity HIGH" />
            </tbody>
          </table>
        </div>
      </div>

      {/* Example timeline */}
      <div>
        <h3 className="display text-base font-semibold mb-2">ตัวอย่าง Timeline 1 วัน</h3>
        <ExampleTimeline />
      </div>

      {/* Safety nets */}
      <div>
        <h3 className="display text-base font-semibold mb-2">ระบบป้องกัน (Safety Nets)</h3>
        <ul className="flex flex-col gap-2 pl-4 list-disc text-ink-muted">
          <li>
            <span className="text-ink">routeAction() guard</span> — ทุกออเดอร์ผ่าน policy engine ก่อน
            ถ้าละเมิด HIGH severity → ไม่ execute แต่ queue เข้า <a href="/approvals" className="text-accent-blue underline">/approvals</a>
          </li>
          <li>
            <span className="text-ink">Cooldown (default 30s)</span> — กันบอท whipsaw ในวันที่ตลาดผันผวน
            ถ้าเพิ่งเทรดเสร็จยังไม่ครบ cooldown จะไม่ trigger trade ใหม่
          </li>
          <li>
            <span className="text-ink">One position at a time</span> — บอทจะมี open trade ได้แค่ 1 ตัวเสมอ
            ถ้าจะเปิดใหม่ที่ทิศทางตรงข้าม ต้องปิดของเก่าก่อน (FLIP)
          </li>
          <li>
            <span className="text-ink">DAILY_LOSS circuit breaker</span> — ถ้าตั้ง policy นี้
            บอทจะถูกบล็อกทันทีเมื่อขาดทุนสะสมในวันเกิน threshold
          </li>
          <li>
            <span className="text-ink">Kill switch</span> — ปุ่ม Kill บน panel ปิดบอททันที (ออเดอร์ที่เปิดอยู่ยังคงเปิด — ต้องปิดเองที่ Capital หรือ Trade Journal)
          </li>
          <li>
            <span className="text-ink">Audit trail</span> — ทุก decision ถูกเขียนลง <a href="/memory" className="text-accent-blue underline">/memory</a>{" "}
            พร้อม metadata (ดูได้ว่าทำไมตัดสินใจแบบนั้น)
          </li>
        </ul>
      </div>
    </div>
  );
}

function ArchitectureDiagram() {
  // 700 × 360 — fits the panel width on most screens
  return (
    <div className="bg-bg-raised/40 rounded border border-line p-4 overflow-x-auto">
      <svg viewBox="0 0 700 360" className="w-full min-w-[600px] h-auto">
        {/* Node helper styles */}
        <defs>
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#63B3ED" />
          </marker>
          <marker id="arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#B794F4" />
          </marker>
          <marker id="arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#68D391" />
          </marker>
        </defs>

        {/* Browser */}
        <Node x={20}  y={20}  w={120} h={50} title="Browser tab" sub="StreamProvider" color="#63B3ED" />
        {/* SSE Stream */}
        <Node x={280} y={20}  w={140} h={50} title="/api/stream" sub="SSE pulse · 5s" color="#63B3ED" />
        {/* autoTrader.tick */}
        <Node x={540} y={20}  w={140} h={50} title="autoTrader.tick()" sub="ทุก 5 วินาที" color="#B794F4" />

        {/* Inside tick — reads */}
        <Node x={20}  y={140} w={140} h={50} title="Setting table" sub="autotrader.*" color="#5a6273" />
        <Node x={200} y={140} w={140} h={50} title="Price table" sub="250 candles ล่าสุด" color="#5a6273" />
        <Node x={380} y={140} w={140} h={50} title="indicators.ts" sub="RSI · MACD · EMA" color="#F6AD55" />
        <Node x={560} y={140} w={120} h={50} title="router.ts" sub="routeAction()" color="#B794F4" />

        {/* Outputs */}
        <Node x={20}  y={260} w={140} h={50} title="capital.ts" sub="placeOrder/closeTrade" color="#68D391" />
        <Node x={200} y={260} w={140} h={50} title="Trade table" sub="บันทึก order" color="#5a6273" />
        <Node x={380} y={260} w={140} h={50} title="Memory" sub="audit log" color="#5a6273" />
        <Node x={560} y={260} w={120} h={50} title="Task (HIL)" sub="ถ้า policy block" color="#FC8181" />

        {/* Arrows */}
        {/* Browser → SSE → tick */}
        <Line x1={140} y1={45} x2={280} y2={45} color="#63B3ED" />
        <Line x1={420} y1={45} x2={540} y2={45} color="#63B3ED" />

        {/* tick down to data layer */}
        <Line x1={610} y1={70} x2={610} y2={140} color="#B794F4" />
        <Line x1={610} y1={140} x2={520} y2={140} color="#B794F4" />
        <Line x1={520} y1={155} x2={450} y2={165} color="#B794F4" />
        <Line x1={520} y1={165} x2={340} y2={165} color="#B794F4" />
        <Line x1={520} y1={175} x2={160} y2={165} color="#B794F4" />

        {/* router → capital + trade + memory + task */}
        <Line x1={610} y1={190} x2={610} y2={260} color="#B794F4" />
        <Line x1={560} y1={285} x2={520} y2={285} color="#B794F4" />
        <Line x1={380} y1={285} x2={340} y2={285} color="#B794F4" />
        <Line x1={200} y1={285} x2={160} y2={285} color="#68D391" />
      </svg>
      <div className="mono text-[10px] text-ink-dim mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <Legend color="#63B3ED" label="SSE pulse" />
        <Legend color="#B794F4" label="Logic / router" />
        <Legend color="#F6AD55" label="Signals" />
        <Legend color="#68D391" label="Broker call" />
      </div>
    </div>
  );
}

function DecisionFlow() {
  // Top-to-bottom decision tree
  return (
    <div className="bg-bg-raised/40 rounded border border-line p-4 overflow-x-auto">
      <svg viewBox="0 0 700 680" className="w-full min-w-[600px] h-auto">
        <defs>
          <marker id="arr-grey" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#5a6273" />
          </marker>
        </defs>

        {/* Start */}
        <Node x={280} y={10} w={140} h={40} title="SSE pulse · 5s" sub="autoTrader.tick()" color="#63B3ED" />
        <Line x1={350} y1={50} x2={350} y2={80} color="#5a6273" />

        {/* Read config */}
        <Decision x={280} y={80} w={140} h={50} label="enabled?" />
        <Line x1={280} y1={105} x2={140} y2={105} color="#5a6273" />
        <Label x={150} y={100} text="NO" />
        <Node x={20} y={80} w={120} h={50} title="→ NONE" sub="ปิดอยู่ ไม่ทำอะไร" color="#5a6273" />

        <Line x1={350} y1={130} x2={350} y2={160} color="#5a6273" />
        <Label x={360} y={150} text="YES" />

        {/* Cooldown */}
        <Decision x={280} y={160} w={140} h={50} label="ใน cooldown?" />
        <Line x1={420} y1={185} x2={560} y2={185} color="#5a6273" />
        <Label x={490} y={180} text="YES" />
        <Node x={560} y={160} w={120} h={50} title="→ HOLD" sub="รอจนพ้น cooldown" color="#5a6273" />

        <Line x1={350} y1={210} x2={350} y2={240} color="#5a6273" />
        <Label x={360} y={230} text="NO" />

        {/* Get candles */}
        <Node x={250} y={240} w={200} h={50} title="ดึง 250 candles + คำนวณ signals" sub="RSI · MACD · EMA" color="#F6AD55" />
        <Line x1={350} y1={290} x2={350} y2={320} color="#5a6273" />

        {/* Consensus check */}
        <Decision x={260} y={320} w={180} h={60} label="ทั้ง 3 สัญญาณ" sub="เห็นพ้องกัน?" />
        <Line x1={440} y1={350} x2={560} y2={350} color="#5a6273" />
        <Label x={490} y={345} text="NO" />
        <Node x={560} y={325} w={120} h={50} title="→ HOLD" sub="no consensus" color="#5a6273" />

        <Line x1={350} y1={380} x2={350} y2={410} color="#5a6273" />
        <Label x={360} y={400} text="YES (BUY/SELL)" />

        {/* Open trade check */}
        <Decision x={280} y={410} w={140} h={50} label="มี open trade?" />

        {/* Branch: no open */}
        <Line x1={280} y1={435} x2={140} y2={435} color="#5a6273" />
        <Label x={150} y={430} text="NO" />
        <Node x={20} y={410} w={120} h={50} title="OPEN ใหม่" sub="ทิศตามสัญญาณ" color="#68D391" />

        {/* Branch: has open */}
        <Line x1={350} y1={460} x2={350} y2={490} color="#5a6273" />
        <Label x={360} y={480} text="YES" />

        <Decision x={260} y={490} w={180} h={50} label="ทิศตรงกับสัญญาณ?" />
        <Line x1={440} y1={515} x2={560} y2={515} color="#5a6273" />
        <Label x={490} y={510} text="YES" />
        <Node x={560} y={490} w={120} h={50} title="→ HOLD" sub="ถือตำแหน่งเดิม" color="#5a6273" />

        <Line x1={350} y1={540} x2={350} y2={570} color="#5a6273" />
        <Label x={360} y={560} text="NO" />
        <Node x={260} y={570} w={180} h={50} title="FLIP" sub="ปิดเก่า + เปิดตรงข้าม" color="#F6AD55" />

        {/* Final routing */}
        <Line x1={80} y1={460} x2={80} y2={620} color="#5a6273" />
        <Line x1={350} y1={620} x2={350} y2={620} color="#5a6273" />
        <Line x1={80} y1={620} x2={620} y2={620} color="#5a6273" />

        <Node x={20} y={620} w={120} h={50} title="routeAction()" sub="policy check" color="#B794F4" />

        <Decision x={200} y={620} w={120} h={50} label="policy OK?" />
        <Label x={155} y={655} text="YES → placeOrder · บันทึก Trade · Memory" />
        <Label x={155} y={668} text="NO  → QUEUED · ส่งเข้า /approvals" />
      </svg>
    </div>
  );
}

function ExampleTimeline() {
  const events = [
    { time: "08:00:00", action: "BOOT",   tone: "text-ink-muted",   text: "เปิด browser → SSE connected → autoTrader.tick() เริ่มทำงาน" },
    { time: "08:00:05", action: "HOLD",   tone: "text-ink-muted",   text: "ไม่มี signal (rsi=NEUTRAL macd=SELL ema=BUY)" },
    { time: "08:02:00", action: "OPEN",   tone: "text-accent-green", text: "ผู้ใช้กด ↯ Trade now (LONG) → manual trigger · เปิด LONG 0.01 @ 4520.10 ทันที" },
    { time: "08:35:10", action: "HOLD",   tone: "text-ink-muted",   text: "MAJORITY 2/3 = BUY แต่ position LONG อยู่แล้ว → ถือต่อ" },
    { time: "10:48:30", action: "FLIP",   tone: "text-accent-amber", text: "MAJORITY flip เป็น SELL → ปิด LONG @ 4528.10 (PnL +0.80) → เปิด SHORT 0.01" },
    { time: "11:30:00", action: "QUEUED", tone: "text-accent-purple", text: "ผู้ใช้ลดค่า MAX_TRADE_SIZE = 0.005 → trade ใหม่โดน policy block → ไปคิว /approvals" },
    { time: "11:30:15", action: "HOLD",   tone: "text-ink-muted",   text: "บอท cooldown 30s · waits" },
    { time: "13:00:00", action: "STOP",   tone: "text-accent-red",  text: "ผู้ใช้กด Kill switch → enabled=false → ออเดอร์ที่เปิดอยู่ยังเปิด" },
  ];
  return (
    <div className="bg-bg-raised/40 rounded border border-line overflow-hidden">
      <table className="w-full text-sm">
        <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/60">
          <tr>
            <th className="text-left px-3 py-2 font-normal w-24">Time</th>
            <th className="text-left px-3 py-2 font-normal w-24">Action</th>
            <th className="text-left px-3 py-2 font-normal">รายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-b border-line/60 last:border-b-0">
              <td className="px-3 py-2 mono text-[11px] text-ink-dim tabular-nums">{e.time}</td>
              <td className={`px-3 py-2 mono text-[11px] font-bold ${e.tone}`}>{e.action}</td>
              <td className="px-3 py-2 mono text-[11px] text-ink-muted">{e.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionRow({ action, tone, when, toast }: { action: string; tone: string; when: string; toast: string }) {
  return (
    <tr className="border-b border-line/60 last:border-b-0">
      <td className={`px-3 py-2 mono text-[11px] font-bold ${tone}`}>{action}</td>
      <td className="px-3 py-2 text-[12px] text-ink-muted">{when}</td>
      <td className="px-3 py-2 mono text-[11px] text-ink-dim">{toast}</td>
    </tr>
  );
}

// SVG helpers ────────────────────────────────────────────────────────────────

function Node({ x, y, w, h, title, sub, color }: { x: number; y: number; w: number; h: number; title: string; sub?: string; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#161a22" stroke={color} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + (sub ? 20 : h / 2 + 4)} textAnchor="middle" fill="#e6e9ef" fontSize="11" fontFamily="var(--font-space-mono), monospace" fontWeight="bold">{title}</text>
      {sub && (
        <text x={x + w / 2} y={y + 36} textAnchor="middle" fill="#8b93a3" fontSize="9" fontFamily="var(--font-space-mono), monospace">{sub}</text>
      )}
    </g>
  );
}

function Decision({ x, y, w, h, label, sub }: { x: number; y: number; w: number; h: number; label: string; sub?: string }) {
  // Diamond-ish via rect with sharper border — simpler than a real diamond and stays readable
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#1a1f2a" stroke="#F6AD55" strokeWidth={1.5} strokeDasharray="4 2" />
      <text x={x + w / 2} y={y + (sub ? 22 : h / 2 + 4)} textAnchor="middle" fill="#F6AD55" fontSize="11" fontFamily="var(--font-space-mono), monospace" fontWeight="bold">{label}</text>
      {sub && (
        <text x={x + w / 2} y={y + 38} textAnchor="middle" fill="#8b93a3" fontSize="10" fontFamily="var(--font-space-mono), monospace">{sub}</text>
      )}
    </g>
  );
}

function Line({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const marker = color === "#63B3ED" ? "arrow-blue" : color === "#B794F4" ? "arrow-purple" : color === "#68D391" ? "arrow-green" : "arr-grey";
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} markerEnd={`url(#${marker})`} />;
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  return <text x={x} y={y} fill="#8b93a3" fontSize="10" fontFamily="var(--font-space-mono), monospace">{text}</text>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-3 w-6 rounded" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
