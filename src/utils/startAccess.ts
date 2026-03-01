interface StartStateInput {
  readonly matchCount: number;
  readonly playerCount: number;
}

interface StartAccessInput extends StartStateInput {
  readonly hasShareParam: boolean;
}

export const isStartupState = (input: StartStateInput): boolean =>
  input.matchCount === 0 && input.playerCount <= 1;

export const shouldRedirectRootToStart = (input: StartStateInput): boolean =>
  isStartupState(input);

export const canAccessStartRoute = (input: StartAccessInput): boolean =>
  input.hasShareParam || isStartupState(input);
