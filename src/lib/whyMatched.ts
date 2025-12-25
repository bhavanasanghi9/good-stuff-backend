// src/lib/whyMatched.ts

type Answers = Record<string, any>;

/**
 * Rule-based "Why you matched"
 * - Deterministic (NO Gemini)
 * - Based ONLY on overlapping MCQ answers
 * - 1–2 lines max
 */
export function buildWhyMatched(a: Answers, b: Answers): string {
  const overlaps: string[] = [];

  const rules: Array<{
    key: string;
    phrase: (value: string) => string;
  }> = [
    {
      key: "thriveWhen",
      phrase: (v) => {
        if (v.includes("activity")) return "love doing activities together";
        if (v.includes("conversation")) return "prefer real conversation over small talk";
        if (v.includes("food")) return "enjoy relaxed food-and-drinks hangouts";
        if (v.includes("creative")) return "connect through creative or cultural experiences";
        if (v.includes("nature")) return "feel best outdoors and in nature";
        if (v.includes("spontaneous")) return "like spontaneous, unstructured plans";
        return "share a similar hangout style";
      },
    },
    {
      key: "conversationStyle",
      phrase: (v) => {
        if (v.includes("stories")) return "open up through storytelling";
        if (v.includes("questions")) return "connect through curiosity and listening";
        if (v.includes("both")) return "have a natural back-and-forth flow";
        if (v.includes("warm")) return "like letting connection build gradually";
        if (v.includes("energy")) return "bring playful, high-energy conversation";
        return "share a similar communication style";
      },
    },
    {
      key: "recharge",
      phrase: (v) => {
        if (v.includes("alone")) return "value solo recharge time";
        if (v.includes("active")) return "reset through movement and activity";
        if (v.includes("people")) return "feel energized around people";
        if (v.includes("creative")) return "recharge through creativity";
        if (v.includes("mood")) return "go with the flow depending on the week";
        return "recharge in similar ways";
      },
    },
    {
      key: "planningStyle",
      phrase: (v) => {
        if (v.includes("scheduled")) return "prefer planning ahead";
        if (v.includes("spontaneous")) return "prefer spontaneous plans";
        if (v.includes("flexible")) return "like keeping plans flexible";
        if (v.includes("stress")) return "prefer low-pressure planning";
        return "have compatible planning styles";
      },
    },
    {
      key: "mostYourself",
      phrase: (v) => {
        if (v.includes("deep")) return "value depth and meaningful connection";
        if (v.includes("laugh")) return "love playful, light energy";
        if (v.includes("new")) return "feel alive trying new experiences";
        if (v.includes("silence")) return "feel comfortable in easy silence";
        if (v.includes("art")) return "connect through art, music, and culture";
        if (v.includes("chill")) return "love calm, low-key vibes";
        return "feel most themselves in similar moments";
      },
    },
  ];

  for (const rule of rules) {
    const av = String(a?.[rule.key] ?? "").toLowerCase();
    const bv = String(b?.[rule.key] ?? "").toLowerCase();
    if (!av || !bv) continue;
    if (av === bv) overlaps.push(rule.phrase(av));
  }

  const unique = Array.from(new Set(overlaps)).slice(0, 3);

  if (unique.length === 0) {
    return "You share an easy, natural compatibility that feels effortless.";
  }

  if (unique.length === 1) {
    return `You both ${unique[0]}.`;
  }

  if (unique.length === 2) {
    return `You both ${unique[0]} and ${unique[1]}.`;
  }

  return `You both ${unique[0]}, ${unique[1]}, and ${unique[2]}.`;
}
