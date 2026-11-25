import ScienceIcon from "@mui/icons-material/Science";
import CalculateIcon from "@mui/icons-material/Calculate";
import CodeIcon from "@mui/icons-material/Code";
import MemoryIcon from "@mui/icons-material/Memory";
import BiotechIcon from "@mui/icons-material/Biotech";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import PublicIcon from "@mui/icons-material/Public";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import FunctionsIcon from "@mui/icons-material/Functions";

const ICONS = [
  ScienceIcon,
  CalculateIcon,
  CodeIcon,
  MemoryIcon,
  BiotechIcon,
  ElectricBoltIcon,
  PublicIcon,
  MenuBookIcon,
  ArchitectureIcon,
  FunctionsIcon,
];

// Deterministic pick so the same subject always shows the same icon.
export function getSubjectIcon(subject) {
  const key = `${subject?.code || ""}${subject?.name || ""}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return ICONS[hash % ICONS.length];
}
