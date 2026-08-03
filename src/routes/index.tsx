import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ControlsScreen } from "@/components/game/ControlsScreen";
import { GameCanvas } from "@/components/game/GameCanvas";

const title = "Two Buttons, One Way Out — Co-op Puzzle Platformer";
const description =
  "A two-player cooperative puzzle platformer prototype: colour-locked switches, stacking, and one very unreliable bridge. Level 1 playable in your browser.";

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
  const [started, setStarted] = useState(false);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        {started ? <GameCanvas /> : <ControlsScreen onStart={() => setStarted(true)} />}
      </div>
    </main>
  );
}
