import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), insert: vi.fn(), localAdd: vi.fn() }));
vi.mock("@/lib/rwa/supabase", () => ({ getSupabaseBrowser: () => ({ auth: { getSession: m.session }, from: () => ({ insert: m.insert, select: () => ({ order: async () => ({ data: [], error: null }) }) }) }) }));
vi.mock("@/lib/rwa/storage", () => ({ addCreation: m.localAdd, listCreations: () => [] }));
import { addToLibrary, initLibrary } from "@/lib/rwa/library";
import type { Creation } from "@/lib/rwa/storage";
const creation: Creation = { id: "test", createdAt: 1, watchId: "watch", watchTitle: "Watch", watchImage: "", creatorId: "creator", creatorName: "Creator", styleId: "style", styleTitle: "Style", sceneTitle: "Scene" };
beforeEach(() => { vi.clearAllMocks(); m.insert.mockResolvedValue({ error: null }); m.localAdd.mockReturnValue([]); });
it("uses the current account owner after replacing an anonymous session", async () => {
  m.session.mockResolvedValue({ data: { session: { user: { id: "anonymous-owner" } } }, error: null });
  await initLibrary();
  m.session.mockResolvedValue({ data: { session: { user: { id: "signed-in-owner" } } }, error: null });
  await addToLibrary(creation);
  expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ owner: "signed-in-owner" }));
});
it("does not reuse a former owner on a signed-out write", async () => {
  m.session.mockResolvedValue({ data: { session: null }, error: null });
  await addToLibrary(creation);
  expect(m.insert).not.toHaveBeenCalled(); expect(m.localAdd).toHaveBeenCalledWith(creation);
});
