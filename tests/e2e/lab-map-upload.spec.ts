import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  labMapFileError,
  labMapStoragePath,
} from "../../app/lib/lab-assets";
import {
  DEFAULT_LAB_MAP_ASPECT_RATIO,
  LAB_SEATS,
  normalizeLabMapAspectRatio,
  normalizeLabSeatLayout,
} from "../../app/lib/lab-map";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Lab map uploads accept supported images up to 10 MB", () => {
  expect(labMapFileError({ type: "image/png", size: 1024 })).toBeNull();
  expect(labMapFileError({ type: "image/jpeg", size: 10 * 1024 * 1024 }))
    .toBeNull();
  expect(labMapFileError({ type: "application/pdf", size: 1024 })).toBe(
    "type",
  );
  expect(labMapFileError({ type: "image/webp", size: 0 })).toBe("size");
  expect(
    labMapFileError({ type: "image/webp", size: 10 * 1024 * 1024 + 1 }),
  ).toBe("size");
});

test("uploaded Lab map URLs can be resolved for safe replacement cleanup", () => {
  expect(
    labMapStoragePath(
      "https://example.supabase.co/storage/v1/object/public/lab-assets/lab-id/maps/map.png",
    ),
  ).toBe("lab-id/maps/map.png");
  expect(labMapStoragePath("/lab-tour-room-v5.png")).toBeNull();
  expect(labMapStoragePath("https://example.com/map.png")).toBeNull();
});

test("invalid persisted layouts safely fall back and valid values are clamped", () => {
  expect(normalizeLabSeatLayout(null)).toEqual(
    LAB_SEATS.map((seat) => ({ ...seat })),
  );
  const layout = LAB_SEATS.map((seat) => ({ ...seat }));
  layout[0] = { ...layout[0], x: -20, y: 120, scale: 3, depth: 200 };
  expect(normalizeLabSeatLayout(layout)[0]).toMatchObject({
    x: 2,
    y: 98,
    scale: 1.5,
    depth: 99,
  });
  expect(normalizeLabMapAspectRatio(10)).toBe(
    DEFAULT_LAB_MAP_ASPECT_RATIO,
  );
  expect(normalizeLabMapAspectRatio(4 / 3)).toBe(4 / 3);
  expect(normalizeLabSeatLayout(layout.slice(0, 3))).toHaveLength(3);
  expect(normalizeLabSeatLayout([])).toHaveLength(LAB_SEATS.length);
});

test("Lab map storage is restricted to admins of the matching lab", () => {
  const migration = source(
    "supabase/migrations/20260810000000_lab_map_storage.sql",
  );
  expect(migration).toContain("file_size_limit");
  expect(migration).toContain("10485760");
  expect(migration).toContain("image/jpeg");
  expect(migration).toContain("image/png");
  expect(migration).toContain("image/webp");
  expect(migration).toContain(
    "public.is_lab_admin(((storage.foldername(name))[1])::uuid)",
  );
  expect(migration).toContain("for insert to authenticated");
  expect(migration).toContain("for delete to authenticated");
});

test("each Lab persists a dynamic normalized map layout", () => {
  const migration = source(
    "supabase/migrations/20260811000000_per_lab_map_layout.sql",
  );
  const dynamicSeatsMigration = source(
    "supabase/migrations/20260812000000_dynamic_lab_map_seats.sql",
  );
  const tenancy = source("app/lib/lab-tenancy.tsx");
  expect(migration).toContain("map_aspect_ratio");
  expect(migration).toContain("map_seat_layout");
  expect(migration).toContain("jsonb_array_length(map_seat_layout) = 8");
  expect(dynamicSeatsMigration).toContain(
    "jsonb_array_length(map_seat_layout) between 1 and 100",
  );
  expect(dynamicSeatsMigration).toContain("clear_removed_lab_map_seats");
  expect(dynamicSeatsMigration).toContain(
    "seat_index >= next_seat_count",
  );
  expect(tenancy).toContain("map_aspect_ratio: normalizeLabMapAspectRatio");
  expect(tenancy).toContain("map_seat_layout: normalizeLabSeatLayout");
});

test("Portal Settings calibrates a map before uploading and publishing it", () => {
  const settings = source("app/labs/[slug]/settings/page.tsx");
  const editor = source("app/components/lab-map-layout-editor.tsx");
  expect(settings).toContain("LabMapLayoutEditor");
  expect(settings).toContain('accept="image/png,image/jpeg,image/webp"');
  expect(settings).toContain("setPendingMapFile(file)");
  expect(settings).toContain("URL.createObjectURL(file)");
  expect(settings).toContain("const upload = await uploadLabMapFile");
  expect(settings).toContain("mapAspectRatio");
  expect(settings).toContain("mapSeatLayout");
  expect(settings).toContain("The new map stays private until you save.");
  expect(settings).toContain("removeLabMapFile(uploadedPath)");
  expect(settings).toContain('event.target.value = ""');
  expect(editor).toContain("setPointerCapture");
  expect(editor).toContain('event.key === "ArrowLeft"');
  expect(editor).toContain("function addSeat()");
  expect(editor).toContain("function removeLastSeat()");
  expect(editor).toContain("MAX_LAB_SEATS");
  expect(editor).toContain("Reset layout");
  expect(settings).not.toContain(
    "setMapSeatLayout(LAB_SEATS.map",
  );
});

test("shared map views consume the active Lab layout and image ratio", () => {
  const map = source("app/components/lab-room-map.tsx");
  const dialog = source("app/components/lab-map-dialog.tsx");
  const tour = source("app/lab-tour/page.tsx");
  expect(map).toContain("activeLab.mapImageUrl");
  expect(map).toContain("activeLab.mapSeatLayout");
  expect(map).toContain("bg-contain");
  expect(dialog).toContain("aspectRatio: activeLab.mapAspectRatio");
  expect(tour).toContain("aspectRatio: activeLab.mapAspectRatio");
  expect(tour).toContain("const mapSeats = activeLab.mapSeatLayout");
});
