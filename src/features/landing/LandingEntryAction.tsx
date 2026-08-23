"use client";

import { createContext, useContext, type ReactNode } from "react";

const LandingEntryActionContext = createContext<ReactNode>(null);

export function LandingEntryActionProvider({
  action,
  children,
}: {
  readonly action: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <LandingEntryActionContext.Provider value={action}>
      {children}
    </LandingEntryActionContext.Provider>
  );
}

export function useLandingEntryAction(): ReactNode {
  return useContext(LandingEntryActionContext);
}
