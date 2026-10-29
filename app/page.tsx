"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/config";
import { Reveal } from "@/components/landing/reveal";
import { Hero } from "@/components/landing/hero";
import { ScrollText } from "@/components/landing/scroll-text";
import { DeployStory } from "@/components/landing/deploy-story";
import { Highlights } from "@/components/landing/highlights";
import { Stats, ConfigFeature } from "@/components/landing/features";
import { WorkflowStack } from "@/components/landing/workflow-stack";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ZoomStatement } from "@/components/landing/zoom-statement";
import { Bento } from "@/components/landing/bento";
import { FillHeadline } from "@/components/landing/fill-headline";
import { DarkChapter } from "@/components/landing/dark-chapter";
import { GrowLink } from "@/components/page-morph";
import { FooterReveal } from "@/components/landing/footer-reveal";

export default function Home() {
  return (
    // `landing` switches the document to Apple's light appearance (see globals.css)
    <div className="landing bg-white text-label">
      <Hero />

      <ScrollText text={`${PRODUCT_NAME} takes the repository you already have and turns every push into a live, global, secure deployment. No servers to manage. No pipelines to babysit. Just push.`} />

      <Highlights />

      {/* Dark chapter: speed, then a deploy from push to live */}
      <DarkChapter>
        <ZoomStatement />
        <DeployStory />
      </DarkChapter>

      <Stats />

      <ConfigFeature />

      <Bento />

      <WorkflowStack />

      {/* ── Closing call to action ── */}
      {/* The last section is a raised sheet that lifts away to uncover the footer */}
      <section className="relative z-10 bg-white py-28 md:py-36 text-center rounded-b-[32px] shadow-[0_40px_60px_-30px_rgba(0,0,0,0.22)]">
        <div className="mx-auto max-w-[760px] px-4 sm:px-6">
          <FillHeadline lines={["Your next deploy", "is one push away."]} />
        </div>
        <Reveal className="mx-auto max-w-[760px] px-4 sm:px-6">
          <p className="text-lede text-label-2 mt-5">Connect a repository and go live in minutes.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            <GrowLink href="/register" className="btn-apple">
              Create your account
            </GrowLink>
            <Link href="/login" className="btn-link">
              Sign in
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </section>

      <FooterReveal>
        <LandingFooter />
      </FooterReveal>
    </div>
  );
}
