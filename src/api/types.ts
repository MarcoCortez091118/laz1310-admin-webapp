import type { components } from "./generated/schema";

export type StaffResponse = components["schemas"]["StaffResponse"];
export type Draft = components["schemas"]["Draft"];
export type PublicState = components["schemas"]["PublicState"];
export type Page = components["schemas"]["Page"];
export type Station = components["schemas"]["Station"];
export type Link = components["schemas"]["Link"];
export type Card = components["schemas"]["Card"];
export type HeroBlock = components["schemas"]["HeroBlock"];
export type TextBlock = components["schemas"]["TextBlock"];
export type RadioBlock = components["schemas"]["RadioBlock"];
export type ShowsBlock = components["schemas"]["ShowsBlock"];
export type CardsBlock = components["schemas"]["CardsBlock"];

export type PageBlock =
  | HeroBlock
  | TextBlock
  | RadioBlock
  | ShowsBlock
  | CardsBlock;
