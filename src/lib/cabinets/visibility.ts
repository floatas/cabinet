import type { CabinetVisibilityMode } from "@/types/cabinets";

export const CABINET_VISIBILITY_OPTIONS: Array<{
  value: CabinetVisibilityMode;
  label: string;
  shortLabel: string;
}> = [
  { value: "own", label: "Own agents only", shortLabel: "Own" },
  { value: "children-1", label: "Include direct children", shortLabel: "+1" },
  { value: "children-2", label: "Include two cabinet levels", shortLabel: "+2" },
  { value: "all", label: "Include all descendants", shortLabel: "All" },
];

export function parseCabinetVisibilityMode(
  value: string | null | undefined
): CabinetVisibilityMode {
  switch (value) {
    case "children-1":
    case "children-2":
    case "all":
      return value;
    default:
      return "own";
  }
}

export function cabinetVisibilityModeToDepth(
  mode: CabinetVisibilityMode
): number | null {
  switch (mode) {
    case "children-1":
      return 1;
    case "children-2":
      return 2;
    case "all":
      return null;
    default:
      return 0;
  }
}

export function cabinetVisibilityModeLabel(
  mode: CabinetVisibilityMode
): string {
  return (
    CABINET_VISIBILITY_OPTIONS.find((option) => option.value === mode)?.label ||
    "Own agents only"
  );
}
