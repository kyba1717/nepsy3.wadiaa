"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2 } from "lucide-react";
import { apiPost } from "@/lib/api";

const TEST_KEY = "اختبار الإدراك البصري 1";

/**
 * correct = the correct picture(s), counted from the LEFT as you see it:
 *   1 = first picture on the left ... 4 = last picture on the right.
 * The child must pick exactly as many pictures as there are correct ones
 * (round 2 has two: the first and the last).
 */
const ROUNDS: { image: string; audio: string; correct: number[] }[] = [
  {
    image: "/images/visual-perception-1/round1.jpg",
    audio: "/audio/visual-perception-1/round1.ogg",
    correct: [3],
  },
  {
    image: "/images/visual-perception-1/round2.jpg",
    audio: "/audio/visual-perception-1/round2.ogg",
    correct: [1, 4],
  },
  {
    image: "/images/visual-perception-1/round3.jpg",
    audio: "/audio/visual-perception-1/round3.ogg",
    correct: [3],
  },
];

type Stage = "intro" | "playing" | "done";

// A round is correct only if the chosen set equals the correct set exactly
const isRoundCorrect = (chosen: number[], correct: number[]) =>
  chosen.length === correct.length && correct.every((c) => chosen.includes(c));

export default function VisualPerception1Page() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<number[][]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [saved, setSaved] = useState<"idle" | "ok" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = (index: number) => {
    try {
      audioRef.current?.pause();
      const a = new Audio(ROUNDS[index].audio);
      audioRef.current = a;
      a.play().catch(() => {});
    } catch {}
  };

  // Play the voice each time a new round starts
  useEffect(() => {
    if (stage === "playing") playAudio(round);
    return () => {
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, round]);

  const handlePick = (n: number) => {
    if (locked) return;
    const need = ROUNDS[round].correct.length;

    // Tap again on a chosen picture = undo it
    if (selected.includes(n)) {
      setSelected(selected.filter((x) => x !== n));
      return;
    }

    const next = [...selected, n];
    setSelected(next);

    if (next.length < need) return; // wait for the remaining pick(s)

    setLocked(true);
    const all = [...answers, next];
    setAnswers(all);
    setTimeout(() => {
      setSelected([]);
      setLocked(false);
      if (round + 1 < ROUNDS.length) {
        setRound(round + 1);
      } else {
        finish(all);
      }
    }, 500);
  };

  const finish = (all: number[][]) => {
    audioRef.current?.pause();
    setStage("done");
    const correct = all.filter((a, i) =>
      isRoundCorrect(a, ROUNDS[i].correct)
    ).length;
    try {
      const child = JSON.parse(localStorage.getItem("childData") || "null");
      if (!child?.id) {
        setSaved("error");
        return;
      }
      apiPost("/results", {
        childId: child.id,
        testKey: TEST_KEY,
        correct,
        incorrect: ROUNDS.length - correct,
        ignored: 0,
        total: ROUNDS.length,
      })
        .then(() => setSaved("ok"))
        .catch(() => setSaved("error"));
    } catch {
      setSaved("error");
    }
  };

  const correctCount = answers.filter((a, i) =>
    isRoundCorrect(a, ROUNDS[i].correct)
  ).length;

  const need = ROUNDS[round]?.correct.length ?? 1;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100/30 p-4 sm:p-6"
      dir="rtl"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl sm:text-2xl">{TEST_KEY}</CardTitle>
              <Button variant="outline" onClick={() => router.push("/tests")}>
                ← العودة للاختبارات
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {stage === "intro" && (
              <div className="text-center space-y-5 py-6">
                <p className="text-lg">
                  ستسمع صوتًا وترى أربع صور. اختر الصورة المناسبة لما سمعته.
                  <br />
                  عدد الجولات: {ROUNDS.length}
                </p>
                <Button
                  className="text-white font-bold text-lg px-10 py-6"
                  onClick={() => setStage("playing")}
                >
                  ابدأ
                </Button>
              </div>
            )}

            {stage === "playing" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    الجولة {round + 1} من {ROUNDS.length}
                    {need > 1 ? ` — اختر ${need} صور` : ""}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => playAudio(round)}
                    className="flex items-center gap-2"
                  >
                    <Volume2 className="w-5 h-5" />
                    إعادة السماع
                  </Button>
                </div>

                {/* The picture strip with 4 clickable zones (left to right) */}
                <div className="relative w-full rounded-2xl overflow-hidden shadow-md bg-white select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ROUNDS[round].image}
                    alt={`الجولة ${round + 1}`}
                    className="w-full h-auto block"
                    draggable={false}
                  />
                  <div className="absolute inset-0 grid grid-cols-4" dir="ltr">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`الصورة ${n}`}
                        onClick={() => handlePick(n)}
                        className={`h-full w-full transition-colors focus:outline-none ${
                          selected.includes(n)
                            ? "bg-brand-600/30 ring-4 ring-inset ring-brand-600"
                            : "hover:bg-brand-600/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {stage === "done" && (
              <div className="text-center space-y-4 py-6">
                <h2 className="text-2xl font-bold">انتهى الاختبار 🎉</h2>
                <p className="text-lg">
                  الإجابات الصحيحة: {correctCount} من {ROUNDS.length}
                </p>
                {saved === "ok" && (
                  <p className="text-green-700 text-sm">تم حفظ النتيجة ✓</p>
                )}
                {saved === "error" && (
                  <p className="text-red-600 text-sm">
                    تعذّر حفظ النتيجة. تأكد من اختيار طفل ثم أعد المحاولة.
                  </p>
                )}
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    className="text-white font-bold"
                    onClick={() => router.push("/tests")}
                  >
                    العودة لقائمة الاختبارات
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAnswers([]);
                      setSelected([]);
                      setRound(0);
                      setSaved("idle");
                      setStage("intro");
                    }}
                  >
                    إعادة الاختبار
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
