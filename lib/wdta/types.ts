export type MatchStatus = "played" | "bye" | "washout" | "forfeit" | "unknown";

export type TeamScore = {
  points: number;
  rubbers: number;
  sets: number;
  games: number;
};

export type MatchPlayer = {
  position: string;
  name: string;
  emergency?: boolean;
};

export type RubberDetail = {
  homePosition: string;
  awayPosition: string;
  scoreLines: string[];
};

export type MatchDetails = {
  heading?: string;
  homeTeam: string;
  awayTeam: string;
  homePlayers: MatchPlayer[];
  awayPlayers: MatchPlayer[];
  rubbers: RubberDetail[];
};

export type MatchResult = {
  matchId?: string;
  status: MatchStatus;
  homeTeam: string;
  awayTeam: string;
  venueNote?: string;
  home?: TeamScore;
  away?: TeamScore;
  details?: MatchDetails;
};

export type RoundResult = {
  round: number;
  date: string;
  matches: MatchResult[];
};

export type LadderEntry = {
  rank: number;
  team: string;
  points: number;
  percentage: number;
  venueNote?: string;
  finalsCut?: boolean;
};

export type SectionResults = {
  sectionCode: string;
  sectionName: string;
  ladder?: LadderEntry[];
  rounds: RoundResult[];
};

export type CachedResults = {
  generatedAt: string;
  source: {
    url: string;
    competitionCode: string;
    competitionName: string;
    resultsLoadedAt?: string;
    laddersLoadedAt?: string;
  };
  sections: SectionResults[];
};

export type SectionTarget = {
  label: string;
  fallbackCode: string;
};
