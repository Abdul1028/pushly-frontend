import { ChevronRight } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/config";
import { Reveal } from "./reveal";
import { SplitHeadline } from "./split-headline";
import { CountUp } from "./count-up";

const DOCS_URL = "https://developers.wareality.tech";

/* ── Numbers band ── */

const STATS = [
  { value: "14", unit: "frameworks", note: "detected automatically" },
  { value: "300+", unit: "edge locations", note: "serving every deploy" },
  { value: "1", unit: "click", note: "to roll back production" },
  { value: "0", unit: "YAML", note: "to write for CI/CD" },
];

export function Stats() {
  return (
    <section id="features" className="scroll-mt-12 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6">
        <SplitHeadline
          className="text-headline text-label max-w-[720px]"
          lines={["Built for shipping.", { text: "Not for configuring.", muted: true }]}
        />
        <div className="mt-14 md:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {STATS.map((s, i) => (
            <Reveal key={s.unit} delay={i * 0.06}>
              <div className="border-t border-separator pt-5">
                <p className="text-[56px] md:text-[64px] leading-none font-semibold tracking-[-0.05em] text-label tabular-nums">
                  <CountUp value={s.value} />
                </p>
                <p className="mt-3 text-[17px] font-semibold text-label">{s.unit}</p>
                <p className="mt-1 text-[15px] text-label-2">{s.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Configuration ── */

export function ConfigFeature() {
  return (
    <section className="bg-white pb-24 md:pb-32">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <Reveal>
          <p className="text-eyebrow text-label-2">Configuration</p>
          <SplitHeadline className="text-section text-label mt-2" lines={["Zero config by default.", "Yours to override."]} />
          <p className="mt-5 text-[17px] leading-[1.47] text-label-2 max-w-[440px]">
            {PRODUCT_NAME} picks the right install and build commands for your framework. When you
            need something different, add one small file to your repository root.
          </p>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="btn-link mt-4">
            Configuration reference
            <ChevronRight className="size-4" aria-hidden />
          </a>
        </Reveal>

        <Reveal delay={0.1}>
          {/* Xcode-style light editor */}
          <div className="rounded-xl border border-black/10 bg-white overflow-hidden shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)]">
            <div className="flex items-center h-10 px-4 bg-[#f6f6f6] border-b border-black/[0.08] text-[12px] text-label-2">
              gitway.config.json
            </div>
            <pre className="p-6 font-mono text-[13px] md:text-[14px] leading-[1.8] text-label overflow-x-auto">
              <code>
                <span className="text-label-3">{"// Every field is optional\n"}</span>
                {"{\n"}
                {"  "}<span className="text-[#9b2393]">&quot;installCommand&quot;</span>: <span className="text-[#c41a16]">&quot;pnpm install&quot;</span>,{"\n"}
                {"  "}<span className="text-[#9b2393]">&quot;buildCommand&quot;</span>: <span className="text-[#c41a16]">&quot;pnpm run build&quot;</span>,{"\n"}
                {"  "}<span className="text-[#9b2393]">&quot;outputDirectory&quot;</span>: <span className="text-[#c41a16]">&quot;out&quot;</span>{"\n"}
                {"}"}
              </code>
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
