"use client";

import { useState } from "react";
import { saveAvatarConfig, type AvatarConfig } from "../lib/lab-social";
import { useI18n } from "../lib/i18n";
import CharacterAvatar from "./character-avatar";

const skinColors = ["#f8d2b3", "#f2b98c", "#d99768", "#ad6b4c", "#704536"];
const hairColors = ["#211815", "#5a3825", "#a86535", "#e2b35b", "#654a85"];
const outfitColors = [
  "#7c5cff",
  "#22b89a",
  "#ff6f78",
  "#f0b72f",
  "#4388e8",
  "#30343f",
];

const characterPresets: {
  label: string;
  config: Pick<AvatarConfig, "gender" | "body" | "hair" | "hairColor">;
}[] = [
  {
    label: "단정한 남성",
    config: {
      gender: "male",
      body: "slim",
      hair: "short",
      hairColor: "#211815",
    },
  },
  {
    label: "가르마 남성",
    config: {
      gender: "male",
      body: "round",
      hair: "side",
      hairColor: "#5a3825",
    },
  },
  {
    label: "웨이브 남성",
    config: {
      gender: "male",
      body: "slim",
      hair: "wave",
      hairColor: "#a86535",
    },
  },
  {
    label: "긴 머리 여성",
    config: {
      gender: "female",
      body: "slim",
      hair: "long",
      hairColor: "#211815",
    },
  },
  {
    label: "웨이브 여성",
    config: {
      gender: "female",
      body: "round",
      hair: "wave",
      hairColor: "#654a85",
    },
  },
  {
    label: "짧은 머리 여성",
    config: {
      gender: "female",
      body: "round",
      hair: "short",
      hairColor: "#a86535",
    },
  },
];

const hairOptions: { value: AvatarConfig["hair"]; label: string }[] = [
  { value: "short", label: "짧은 머리" },
  { value: "side", label: "가르마" },
  { value: "long", label: "긴 머리" },
  { value: "wave", label: "웨이브" },
];

const accessoryOptions: {
  value: AvatarConfig["accessory"];
  label: string;
  symbol: string;
}[] = [
  { value: "none", label: "없음", symbol: "·" },
  { value: "glasses", label: "안경", symbol: "👓" },
  { value: "star", label: "별", symbol: "★" },
  { value: "headphones", label: "헤드폰", symbol: "🎧" },
];

type AvatarDesignerProps = {
  userId: string;
  name: string;
  background: string;
  initialConfig: AvatarConfig;
  onSaved: (config: AvatarConfig) => void;
};

export default function AvatarDesigner({
  userId,
  name,
  background,
  initialConfig,
  onSaved,
}: AvatarDesignerProps) {
  const { l } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await saveAvatarConfig(userId, { ...config, character: "person" });
      onSaved({ ...config, character: "person" });
      setIsOpen(false);
    } catch {
      setError(
        l(
          "캐릭터를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
          "Không thể lưu nhân vật. Vui lòng thử lại sau.",
          "Could not save the character. Please try again shortly.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openDesigner() {
    setConfig({ ...initialConfig, character: "person" });
    setError("");
    setIsOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDesigner}
        aria-label={l(
          "캐릭터 꾸미기",
          "Tùy chỉnh nhân vật",
          "Customize character",
        )}
        title={l("캐릭터 꾸미기", "Tùy chỉnh nhân vật", "Customize character")}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd84d] text-lg font-black text-stone-950 shadow-lg ring-4 ring-[#181611] transition hover:-translate-y-0.5 hover:bg-white"
      >
        ✎
      </button>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-designer-title"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 text-stone-950 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="grid max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-[#f5f3ee] shadow-2xl md:grid-cols-[.72fr_1.28fr]"
          >
            <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-[#211d35] p-8">
              <div className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-[#ffd84d]/20 blur-3xl" />
              <div className="relative text-center">
                <CharacterAvatar
                  config={config}
                  background={background}
                  name={name}
                  size={184}
                  className="ring-8 ring-white/10 shadow-2xl"
                />
                <p className="mt-6 text-sm font-black text-white">
                  {l(
                    `${name}의 캐릭터`,
                    `Nhân vật của ${name}`,
                    `${name}'s character`,
                  )}
                </p>
                <p className="mt-1 text-xs font-bold text-white/35">
                  {l(
                    "스타일을 자유롭게 조합해 보세요.",
                    "Tự do kết hợp phong cách của bạn.",
                    "Mix and match your style freely.",
                  )}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">
                    CHARACTER STUDIO
                  </p>
                  <h2
                    id="avatar-designer-title"
                    className="mt-2 text-3xl font-black tracking-[-0.04em]"
                  >
                    {l("나만의 캐릭터", "Nhân vật của tôi", "My character")}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label={l(
                    "캐릭터 스튜디오 닫기",
                    "Đóng Character Studio",
                    "Close Character Studio",
                  )}
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mt-7 space-y-6">
                <fieldset>
                  <legend className="text-xs font-black text-stone-500">
                    {l("기본 캐릭터", "Nhân vật mẫu", "Character presets")}
                  </legend>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {characterPresets.map((preset) => {
                      const previewConfig = {
                        ...config,
                        ...preset.config,
                        character: "person" as const,
                      };
                      const selected =
                        config.gender === preset.config.gender &&
                        config.body === preset.config.body &&
                        config.hair === preset.config.hair;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              ...preset.config,
                              character: "person",
                            }))
                          }
                          className={`flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-[10px] font-black transition ${selected ? "bg-stone-950 text-white ring-2 ring-stone-950" : "bg-white ring-1 ring-black/[0.06] hover:-translate-y-0.5"}`}
                        >
                          <CharacterAvatar
                            config={previewConfig}
                            background={background}
                            name={preset.label}
                            size={52}
                          />
                          <span className="leading-tight">
                            {preset.label === "단정한 남성"
                              ? l(preset.label, "Nam gọn gàng", "Neat male")
                              : preset.label === "가르마 남성"
                                ? l(
                                    preset.label,
                                    "Nam rẽ ngôi",
                                    "Side-part male",
                                  )
                                : preset.label === "웨이브 남성"
                                  ? l(
                                      preset.label,
                                      "Nam tóc xoăn",
                                      "Wavy-haired male",
                                    )
                                  : preset.label === "긴 머리 여성"
                                    ? l(
                                        preset.label,
                                        "Nữ tóc dài",
                                        "Long-haired female",
                                      )
                                    : preset.label === "웨이브 여성"
                                      ? l(
                                          preset.label,
                                          "Nữ tóc xoăn",
                                          "Wavy-haired female",
                                        )
                                      : l(
                                          preset.label,
                                          "Nữ tóc ngắn",
                                          "Short-haired female",
                                        )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="grid gap-5 sm:grid-cols-2">
                  <fieldset>
                    <legend className="text-xs font-black text-stone-500">
                      {l("스타일", "Phong cách", "Style")}
                    </legend>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(
                        [
                          { value: "male", label: "남성" },
                          { value: "female", label: "여성" },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              gender: option.value,
                            }))
                          }
                          className={`rounded-2xl px-3 py-3 text-xs font-black ${config.gender === option.value ? "bg-stone-950 text-white" : "bg-white ring-1 ring-black/[0.06]"}`}
                        >
                          {option.value === "male"
                            ? l(option.label, "Nam", "Male")
                            : l(option.label, "Nữ", "Female")}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="text-xs font-black text-stone-500">
                      {l("체형", "Dáng người", "Body type")}
                    </legend>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(
                        [
                          { value: "slim", label: "슬림" },
                          { value: "round", label: "통통" },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              body: option.value,
                            }))
                          }
                          className={`rounded-2xl px-3 py-3 text-xs font-black ${config.body === option.value ? "bg-stone-950 text-white" : "bg-white ring-1 ring-black/[0.06]"}`}
                        >
                          {option.value === "slim"
                            ? l(option.label, "Mảnh", "Slim")
                            : l(option.label, "Tròn", "Round")}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <fieldset>
                  <legend className="text-xs font-black text-stone-500">
                    {l("피부색", "Màu da", "Skin tone")}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skinColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={l(
                          `피부색 ${color}`,
                          `Màu da ${color}`,
                          `Skin tone ${color}`,
                        )}
                        onClick={() =>
                          setConfig((current) => ({ ...current, skin: color }))
                        }
                        className={`h-9 w-9 rounded-full ring-offset-2 ${config.skin === color ? "ring-2 ring-stone-950" : "ring-1 ring-black/10"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-xs font-black text-stone-500">
                    {l("헤어 스타일", "Kiểu tóc", "Hair style")}
                  </legend>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {hairOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setConfig((current) => ({
                            ...current,
                            hair: option.value,
                          }))
                        }
                        className={`rounded-2xl px-2 py-3 text-center text-xs font-black transition ${config.hair === option.value ? "bg-stone-950 text-white" : "bg-white ring-1 ring-black/[0.06]"}`}
                      >
                        {option.value === "short"
                          ? l(option.label, "Tóc ngắn", "Short")
                          : option.value === "side"
                            ? l(option.label, "Rẽ ngôi", "Side part")
                            : option.value === "long"
                              ? l(option.label, "Tóc dài", "Long")
                              : l(option.label, "Tóc xoăn", "Wavy")}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-xs font-black text-stone-500">
                    {l("헤어 컬러", "Màu tóc", "Hair color")}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hairColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={l(
                          `헤어 컬러 ${color}`,
                          `Màu tóc ${color}`,
                          `Hair color ${color}`,
                        )}
                        onClick={() =>
                          setConfig((current) => ({
                            ...current,
                            hairColor: color,
                          }))
                        }
                        className={`h-9 w-9 rounded-full ring-offset-2 ${config.hairColor === color ? "ring-2 ring-stone-950" : "ring-1 ring-black/10"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-xs font-black text-stone-500">
                    {l("의상 컬러", "Màu trang phục", "Outfit color")}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {outfitColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={l(
                          `의상 컬러 ${color}`,
                          `Màu trang phục ${color}`,
                          `Outfit color ${color}`,
                        )}
                        onClick={() =>
                          setConfig((current) => ({
                            ...current,
                            outfitColor: color,
                          }))
                        }
                        className={`h-9 w-9 rounded-xl ring-offset-2 ${config.outfitColor === color ? "ring-2 ring-stone-950" : "ring-1 ring-black/10"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-xs font-black text-stone-500">
                    {l("액세서리", "Phụ kiện", "Accessory")}
                  </legend>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {accessoryOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setConfig((current) => ({
                            ...current,
                            accessory: option.value,
                          }))
                        }
                        className={`rounded-2xl px-2 py-3 text-center text-xs font-black transition ${config.accessory === option.value ? "bg-[#ffd84d] text-stone-950 ring-2 ring-stone-950" : "bg-white ring-1 ring-black/[0.06]"}`}
                      >
                        <span className="block text-lg">{option.symbol}</span>
                        <span className="mt-1 block">
                          {option.value === "none"
                            ? l(option.label, "Không", "None")
                            : option.value === "glasses"
                              ? l(option.label, "Kính", "Glasses")
                              : option.value === "star"
                                ? l(option.label, "Ngôi sao", "Star")
                                : l(option.label, "Tai nghe", "Headphones")}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              {error && (
                <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={save}
                className="mt-7 w-full rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#b89500] disabled:opacity-50"
              >
                {isSaving
                  ? l("저장 중...", "Đang lưu...", "Saving...")
                  : l(
                      "이 캐릭터로 저장",
                      "Lưu nhân vật này",
                      "Save this character",
                    )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
