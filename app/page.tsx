import Link from "next/link";
import { TodayWeather } from "@/components/TodayWeather";
import { FamilyClocks } from "@/components/FamilyClocks";
import { SuggestionOfDay } from "@/components/SuggestionOfDay";
import { Forecast7Day } from "@/components/Forecast7Day";
import { Flood } from "@/components/Flood";
import { Market } from "@/components/Market";
import { News } from "@/components/News";
import { ExploreMap } from "@/components/ExploreMap";
import { OutAndAbout } from "@/components/OutAndAbout";
import { WhatsOn } from "@/components/WhatsOn";
import { NoticeBoard } from "@/components/NoticeBoard";
import { Courts } from "@/components/Courts";
import { Skiing } from "@/components/Skiing";
import { GoodRide } from "@/components/GoodRide";
import { Trains } from "@/components/Trains";
import { Section } from "@/components/Section";
import { WatercolorScene } from "@/components/WatercolorScene";
import { WarningBanner } from "@/components/WarningBanner";
import { Calendar } from "@/components/Calendar";
import { BrambleWalk } from "@/components/BrambleWalk";
import { BinDay } from "@/components/BinDay";
import { Occasions } from "@/components/Occasions";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-20">
      <WarningBanner className="mt-4" />
      {/* ── header ─────────────────────────────────────── */}
      <header className="pt-12 pb-2">
        <h1 className="text-4xl">cottage view</h1>
        <p className="text-muted">a quiet view of home and the family.</p>
      </header>

      <div className="space-y-6">
        {/* ── today ──────────────────────────────────────── */}
        <div>
          <TodayWeather />
          <Link href="/weather" className="section-label mt-2 inline-block">
            rain radar & full forecast ↗
          </Link>
          <FamilyClocks />
          <Link href="/messages" className="section-label mt-3 inline-block">
            family messages ↗
          </Link>
          <Link href="/family" className="section-label mt-3 ml-4 inline-block">
            the kitchen frame: photos & settings ↗
          </Link>
        </div>

        {/* ── coming up (shared family calendar) ─────────── */}
        <Calendar />

        {/* ── bin day ────────────────────────────────────── */}
        <BinDay />

        {/* ── celebrations (family birthdays & countdowns) ─ */}
        <Occasions />

        {/* ── out & about ────────────────────────────────── */}
        <div>
          <div className="grid gap-5 md:grid-cols-2 items-stretch">
            <SuggestionOfDay />
            <GoodRide />
          </div>
          <BrambleWalk />
          <Section label="paths & cycle routes">
            <ExploreMap />
            <Link href="/map" className="section-label mt-2 inline-block">
              open the full map ↗
            </Link>
          </Section>
        </div>

        {/* ── the week ───────────────────────────────────── */}
        <div>
          <Forecast7Day />
        </div>

        {/* ── good to know ───────────────────────────────── */}
        <div>
          <div className="grid gap-5 md:grid-cols-2 items-stretch">
            <Flood />
            <Market />
            <Trains />
            <News />
          </div>
        </div>

        {/* ── explore ────────────────────────────────────── */}
        <div>
          <OutAndAbout />
          <WhatsOn />
          <div className="grid gap-5 md:grid-cols-2 items-stretch">
            <Courts />
            <Skiing />
          </div>
        </div>

        {/* ── worth noticing ─────────────────────────────── */}
        <NoticeBoard />

        {/* ── footer ─────────────────────────────────────── */}
        <Section label="the dog" className="flex flex-col items-center text-center max-w-xs mx-auto">
          <WatercolorScene sceneKey="bramble" alt="Bramble" className="mx-auto max-w-sm w-full" />
          <p className="section-label mt-3">bramble</p>
        </Section>
      </div>
    </main>
  );
}
