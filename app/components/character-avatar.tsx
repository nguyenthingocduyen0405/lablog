import type { AvatarConfig } from "../lib/lab-social";

type CharacterAvatarProps = {
  config: AvatarConfig;
  background?: string;
  name?: string;
  size?: number;
  className?: string;
};

export default function CharacterAvatar({ config, background = "linear-gradient(135deg, #ffd84d, #ff9a67)", name = "Lab member", size = 48, className = "" }: CharacterAvatarProps) {
  return (
    <span role="img" aria-label={`${name} character`} className={`relative inline-block shrink-0 overflow-hidden rounded-[34%] shadow-inner ${className}`} style={{ width: size, height: size, background }}>
      <span className="absolute bottom-[-8%] left-[16%] h-[43%] w-[68%] rounded-t-[48%]" style={{ backgroundColor: config.outfitColor }} />
      <span className="absolute bottom-[4%] left-[43%] h-[25%] w-[14%] rounded-t-full bg-white/70" />

      <span className="absolute left-[21%] top-[17%] h-[54%] w-[58%] rounded-[46%] shadow-[inset_0_-3px_0_rgba(120,65,45,.08)]" style={{ backgroundColor: config.skin }}>
        <span className="absolute left-[-6%] top-[46%] h-[18%] w-[13%] rounded-full" style={{ backgroundColor: config.skin }} />
        <span className="absolute right-[-6%] top-[46%] h-[18%] w-[13%] rounded-full" style={{ backgroundColor: config.skin }} />
        <span className="absolute left-[24%] top-[46%] h-[7%] w-[7%] rounded-full bg-stone-950" />
        <span className="absolute right-[24%] top-[46%] h-[7%] w-[7%] rounded-full bg-stone-950" />
        <span className="absolute left-[12%] top-[59%] h-[9%] w-[13%] rounded-full bg-rose-400/35" />
        <span className="absolute right-[12%] top-[59%] h-[9%] w-[13%] rounded-full bg-rose-400/35" />
        <span className="absolute bottom-[17%] left-[39%] h-[10%] w-[22%] rounded-b-full border-b-2 border-stone-800" />

        {config.accessory === "glasses" && <><span className="absolute left-[11%] top-[37%] h-[26%] w-[31%] rounded-full border-[2px] border-stone-800" /><span className="absolute right-[11%] top-[37%] h-[26%] w-[31%] rounded-full border-[2px] border-stone-800" /><span className="absolute left-[42%] top-[48%] h-[2px] w-[16%] bg-stone-800" /></>}
      </span>

      {config.hair === "wave" && <><span className="absolute left-[19%] top-[9%] h-[29%] w-[62%] rounded-[50%_50%_35%_35%]" style={{ backgroundColor: config.hairColor }} /><span className="absolute left-[17%] top-[23%] h-[29%] w-[18%] rounded-full" style={{ backgroundColor: config.hairColor }} /><span className="absolute right-[17%] top-[23%] h-[25%] w-[17%] rounded-full" style={{ backgroundColor: config.hairColor }} /></>}
      {config.hair === "short" && <span className="absolute left-[22%] top-[10%] h-[25%] w-[56%] rounded-[50%_50%_24%_24%]" style={{ backgroundColor: config.hairColor }} />}
      {config.hair === "cap" && <><span className="absolute left-[17%] top-[7%] h-[29%] w-[66%] rounded-t-full rounded-b-[24%]" style={{ backgroundColor: config.hairColor }} /><span className="absolute right-[8%] top-[28%] h-[8%] w-[32%] rounded-full" style={{ backgroundColor: config.hairColor }} /></>}
      {config.hair === "sprout" && <><span className="absolute left-[22%] top-[12%] h-[22%] w-[56%] rounded-t-full rounded-b-[30%]" style={{ backgroundColor: config.hairColor }} /><span className="absolute left-[48%] top-[1%] h-[15%] w-[5%] rounded-full" style={{ backgroundColor: config.hairColor }} /><span className="absolute left-[37%] top-[1%] h-[10%] w-[15%] rotate-[-28deg] rounded-full" style={{ backgroundColor: config.hairColor }} /><span className="absolute right-[36%] top-[2%] h-[10%] w-[15%] rotate-[28deg] rounded-full" style={{ backgroundColor: config.hairColor }} /></>}

      {config.accessory === "star" && <span className="absolute right-[7%] top-[8%] flex h-[28%] w-[28%] items-center justify-center rounded-full bg-white/90 text-[0.55em] shadow-sm">★</span>}
      {config.accessory === "headphones" && <><span className="absolute left-[13%] top-[25%] h-[38%] w-[12%] rounded-full bg-stone-800" /><span className="absolute right-[13%] top-[25%] h-[38%] w-[12%] rounded-full bg-stone-800" /><span className="absolute left-[20%] top-[10%] h-[28%] w-[60%] rounded-t-full border-[3px] border-b-0 border-stone-800" /></>}
    </span>
  );
}
