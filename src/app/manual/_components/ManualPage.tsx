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
        </div>

        <div>
          <div className="mono text-xs uppercase tracking-widest text-ink-dim mb-1">3. Candlestick Chart</div>
          <p className="text-ink-muted">
            กราฟแท่งเทียน 1 นาที 200 แท่งล่าสุด ใช้ lightweight-charts (TradingView library)
          </p>
          <Tip>
            ถ้ากราฟว่าง ให้รัน <code className="text-ink">curl -X POST http://localhost:3000/api/reseed</code>
            แล้ว refresh — ระบบจะ seed 200 แท่งใหม่
          </Tip>
        </div>

        <div>
          <div className="mono text-xs uppercase tracking-widest text-ink-purple mb-1">4. Auto-Trader 🤖</div>
          <p className="text-ink-muted mb-2">
            บอทเทรดอัตโนมัติ ทำงานเมื่อ <span className="text-ink">RSI + MACD + EMA</span> ทั้ง 3 ตัวให้สัญญาณเดียวกัน
            (CONSENSUS strategy)
          </p>
          <p className="font-semibold text-ink mb-1">วิธีเปิดใช้:</p>
          <ol className="flex flex-col gap-1 pl-4 list-decimal text-ink-muted">
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
          <Tip>
            บอท CONSENSUS จะไม่เทรดบ่อย — เพราะต้องรอให้ทั้ง 3 indicator เห็นพ้องกัน อาจรอเป็นชั่วโมง
            ถ้าอยากให้บอทเทรดบ่อยขึ้นเพื่อทดสอบ บอกได้ จะเพิ่ม strategy แบบ RSI_ONLY หรือ MAJORITY_2OF3 ให้
          </Tip>
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
          Price table ว่าง — รัน{" "}
          <code className="text-ink">curl -X POST http://localhost:3000/api/reseed</code>{" "}
          แล้ว refresh หน้า
        </Faq>
        <Faq q="Auto-Trader เปิดแล้วแต่ไม่เทรด">
          ดูบรรทัด <span className="text-ink">Last decision</span> ที่ panel:
          <ul className="pl-4 list-disc mt-1 text-ink-muted">
            <li><code className="text-ink">not enough candles</code> → reseed (ดูข้อด้านบน)</li>
            <li><code className="text-ink">no consensus</code> → บอททำงานปกติ แค่รอสัญญาณ อาจรอเป็นชั่วโมง</li>
            <li><code className="text-ink">cooldown · Ns left</code> → รอ cooldown ผ่านไป</li>
            <li><code className="text-ink">tick error</code> → ดู console เซิร์ฟเวอร์ — มัก Capital API ล่ม / rate limit</li>
          </ul>
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
          ปัจจุบันใช้ strategy <code className="text-ink">CONSENSUS</code> (ทั้ง 3 indicator ต้องเห็นพ้อง)
          ถ้าอยากให้บ่อยขึ้น บอกได้ จะเพิ่ม <code className="text-ink">RSI_ONLY</code> หรือ <code className="text-ink">MAJORITY_2OF3</code> ให้
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
