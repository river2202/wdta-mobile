export type MatchStatus = "played" | "bye" | "washout" | "forfeit" | "unknown";

export type TeamScore = {
  points: number;
  rubbers: number;
  sets: number;
  games: number;
};

export type MatchResult = {
  matchId?: string;
  status: MatchStatus;
  homeTeam: string;
  awayTeam: string;
  venueNote?: string;
  home?: TeamScore;
  away?: TeamScore;
};

export type RoundResult = {
  round: number;
  date: string;
  matches: MatchResult[];
};

export type SectionResults = {
  sectionCode: string;
  sectionName: string;
  rounds: RoundResult[];
};

export type CachedResults = {
  generatedAt: string;
  source: {
    url: string;
    competitionCode: string;
    competitionName: string;
    resultsLoadedAt?: string;
  };
  sections: SectionResults[];
};

export type SectionTarget = {
  label: string;
  fallbackCode: string;
};

