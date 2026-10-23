import { BrazilianState } from "./brazilian-states.constant";

export enum BrazilianRegion {
  NORTE = "NORTE",
  NORDESTE = "NORDESTE",
  CENTRO_OESTE = "CENTRO_OESTE",
  SUDESTE = "SUDESTE",
  SUL = "SUL",
}

export const REGION_LABELS: Record<BrazilianRegion, string> = {
  [BrazilianRegion.NORTE]: "Norte",
  [BrazilianRegion.NORDESTE]: "Nordeste",
  [BrazilianRegion.CENTRO_OESTE]: "Centro-Oeste",
  [BrazilianRegion.SUDESTE]: "Sudeste",
  [BrazilianRegion.SUL]: "Sul",
};

export const REGION_STATES: Record<BrazilianRegion, BrazilianState[]> = {
  [BrazilianRegion.NORTE]: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
  [BrazilianRegion.NORDESTE]: [
    "AL",
    "BA",
    "CE",
    "MA",
    "PB",
    "PE",
    "PI",
    "RN",
    "SE",
  ],
  [BrazilianRegion.CENTRO_OESTE]: ["DF", "GO", "MT", "MS"],
  [BrazilianRegion.SUDESTE]: ["ES", "MG", "RJ", "SP"],
  [BrazilianRegion.SUL]: ["PR", "RS", "SC"],
};

export const STATE_REGION: Record<string, BrazilianRegion> = Object.fromEntries(
  Object.entries(REGION_STATES).flatMap(([region, states]) =>
    states.map((state) => [state, region as BrazilianRegion]),
  ),
);
