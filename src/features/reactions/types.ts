export interface Reaction {
  id: string;
  value: string;
  count: number;
  users: { id: string; name: string }[];
}

export interface AddReactionData {
  emoji: string;
}

export interface ToggleReactionData {
  emoji: string;
}

// API Response types
export interface ReactionResponse {
  success: boolean;
  data: {
    reaction: Reaction;
  };
  error?: string;
}

export interface ReactionsResponse {
  success: boolean;
  data: {
    reactions: Reaction[];
  };
  error?: string;
}

export interface ToggleReactionResponse {
  success: boolean;
  data: {
    reaction?: Reaction;
    removed: boolean;
  };
  error?: string;
}
