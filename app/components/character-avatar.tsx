import type { AvatarConfig } from "../lib/lab-social";

type CharacterAvatarProps = {
  config: AvatarConfig;
  background?: string;
  name?: string;
  size?: number;
  className?: string;
};

export default function CharacterAvatar({
  config,
  background = "linear-gradient(135deg, #ffd84d, #ff9a67)",
  name = "Lab member",
  size = 48,
  className = "",
}: CharacterAvatarProps) {
  const isRound = config.body === "round";
  const isFemale = config.gender === "female";

  return (
    <span
      role="img"
      aria-label={`${name} character`}
      className={`relative inline-block shrink-0 overflow-hidden rounded-[34%] shadow-inner ${className}`}
      style={{ width: size, height: size, background }}
    >
      {config.hair === "long" && (
        <span
          className="absolute left-[17%] top-[8%] h-[70%] w-[66%] rounded-t-[48%] rounded-b-[34%]"
          style={{ backgroundColor: config.hairColor }}
        />
      )}
      {config.hair === "wave" && (
        <>
          <span className="absolute left-[15%] top-[9%] h-[66%] w-[70%] rounded-[48%_48%_34%_34%]" style={{ backgroundColor: config.hairColor }} />
          <span className="absolute bottom-[20%] left-[13%] h-[25%] w-[22%] rounded-full" style={{ backgroundColor: config.hairColor }} />
          <span className="absolute bottom-[20%] right-[13%] h-[25%] w-[22%] rounded-full" style={{ backgroundColor: config.hairColor }} />
        </>
      )}

      <span
        className={`absolute bottom-[-8%] left-1/2 h-[45%] -translate-x-1/2 rounded-t-[48%] ${isRound ? "w-[78%]" : "w-[60%]"}`}
        style={{ backgroundColor: config.outfitColor }}
      />
      <span className="absolute bottom-[4%] left-[43%] h-[25%] w-[14%] rounded-t-full bg-white/70" />

      <span
        className="absolute left-[21%] top-[17%] h-[54%] w-[58%] rounded-[46%] shadow-[inset_0_-3px_0_rgba(120,65,45,.08)]"
        style={{ backgroundColor: config.skin }}
      >
        <span className="absolute left-[-6%] top-[46%] h-[18%] w-[13%] rounded-full" style={{ backgroundColor: config.skin }} />
        <span className="absolute right-[-6%] top-[46%] h-[18%] w-[13%] rounded-full" style={{ backgroundColor: config.skin }} />
        <span className="absolute left-[24%] top-[45%] h-[7%] w-[7%] rounded-full bg-stone-950" />
        <span className="absolute right-[24%] top-[45%] h-[7%] w-[7%] rounded-full bg-stone-950" />
        {isFemale && (
          <>
            <span className="absolute left-[18%] top-[39%] h-[2px] w-[12%] -rotate-12 bg-stone-800" />
            <span className="absolute right-[18%] top-[39%] h-[2px] w-[12%] rotate-12 bg-stone-800" />
          </>
        )}
        <span className="absolute left-[12%] top-[59%] h-[9%] w-[13%] rounded-full bg-rose-400/35" />
        <span className="absolute right-[12%] top-[59%] h-[9%] w-[13%] rounded-full bg-rose-400/35" />
        <span className="absolute bottom-[17%] left-[39%] h-[10%] w-[22%] rounded-b-full border-b-2 border-stone-800" />

        {config.accessory === "glasses" && (
          <>
            <span className="absolute left-[11%] top-[37%] h-[26%] w-[31%] rounded-full border-[2px] border-stone-800" />
            <span className="absolute right-[11%] top-[37%] h-[26%] w-[31%] rounded-full border-[2px] border-stone-800" />
            <span className="absolute left-[42%] top-[48%] h-[2px] w-[16%] bg-stone-800" />
          </>
        )}
      </span>

      {config.hair === "short" && (
        <span className="absolute left-[21%] top-[9%] h-[27%] w-[58%] rounded-[52%_52%_25%_25%]" style={{ backgroundColor: config.hairColor }} />
      )}
      {config.hair === "side" && (
        <>
          <span className="absolute left-[20%] top-[8%] h-[27%] w-[60%] rounded-[55%_55%_20%_28%]" style={{ backgroundColor: config.hairColor }} />
          <span className="absolute left-[20%] top-[19%] h-[29%] w-[18%] -rotate-12 rounded-full" style={{ backgroundColor: config.hairColor }} />
        </>
      )}
      {config.hair === "long" && (
        <span className="absolute left-[20%] top-[8%] h-[28%] w-[60%] rounded-[52%_52%_30%_30%]" style={{ backgroundColor: config.hairColor }} />
      )}
      {config.hair === "wave" && (
        <span className="absolute left-[19%] top-[8%] h-[30%] w-[62%] rounded-[50%_50%_35%_35%]" style={{ backgroundColor: config.hairColor }} />
      )}

      {config.accessory === "star" && <span className="absolute right-[7%] top-[8%] flex h-[28%] w-[28%] items-center justify-center rounded-full bg-white/90 text-[0.55em] shadow-sm">★</span>}
      {config.accessory === "headphones" && (
        <>
          <span className="absolute left-[13%] top-[25%] h-[38%] w-[12%] rounded-full bg-stone-800" />
          <span className="absolute right-[13%] top-[25%] h-[38%] w-[12%] rounded-full bg-stone-800" />
          <span className="absolute left-[20%] top-[10%] h-[28%] w-[60%] rounded-t-full border-[3px] border-b-0 border-stone-800" />
        </>
      )}
    </span>
  );
}
