
export type OnboardingInput = {
  photoDataUrl?: string;
  answers: {
    alive: string;
    intent: string;
    soundtrack: string;
    hangout: string[];
    peace: string;
    aboutYou: string;
  };
  city?: string;
  lat?: number;
  lon?: number;
};

export type MatchCard = {
  id: string;
  name: string;
  photo: string;
  social: { handle: string; url: string };
  tags: string[];
  quote: string;
};

export type Idea = {
  title: string;
  desc: string;
  time: string;
  photo: string;
  mapUrl: string;
  summary?: string;
  itinerary?: Array<{ time?: string; activity: string; notes?: string }>;
};
