import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ControlsScreen } from "@/components/game/ControlsScreen";
import { GameCanvas } from "@/components/game/GameCanvas";

const title = "Two Buttons, One Way Out — Co-op Puzzle Platformer";
const description =
  "A two-player cooperative puzzle platformer prototype: colour-locked switches, stacking, and one very unreliable bridge. Demo level playable in your browser.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [startedLevel, setStartedLevel] = useState<string | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl md:max-w-4xl">
        {startedLevel ? (
          <GameCanvas initialLevel={startedLevel} />
        ) : (
          <ControlsScreen onStart={(levelKey = "Level1") => setStartedLevel(levelKey)} />
        )}
      </div>
    </main>
  );
}
