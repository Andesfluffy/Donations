import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// revalidatePath needs Next's request context, which does not exist outside a
// server render. Cache invalidation is not what these tests are about — the
// moderation guard is — so the module is stubbed rather than the action being
// reshaped to suit the harness.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { db } from "@/lib/db";
import { recordPrayer, submitIntention } from "@/app/pray/actions";

const hasDatabase = Boolean(process.env.DATABASE_URL);

const MARKER = "[test-intention]";
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

async function cleanup() {
  await db.prayerIntention.deleteMany({ where: { text: { contains: MARKER } } });
}

describe.skipIf(!hasDatabase)("prayer intentions", () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  it("stores a submitted intention unapproved", async () => {
    const result = await submitIntention(
      { status: "idle" },
      form({ text: `${MARKER} for the families in the parish hall` }),
    );

    expect(result.status).toBe("success");

    const row = await db.prayerIntention.findFirst({
      where: { text: { contains: MARKER } },
    });

    // The whole point: submitting does not publish.
    expect(row).not.toBeNull();
    expect(row?.approvedAt).toBeNull();
  });

  it("keeps unapproved intentions out of the public query", async () => {
    await submitIntention(
      { status: "idle" },
      form({ text: `${MARKER} should stay hidden` }),
    );

    const publiclyVisible = await db.prayerIntention.findMany({
      where: { approvedAt: { not: null }, text: { contains: MARKER } },
    });

    expect(publiclyVisible).toHaveLength(0);
  });

  it("shows an intention once a moderator approves it", async () => {
    await submitIntention({ status: "idle" }, form({ text: `${MARKER} awaiting review` }));

    await db.prayerIntention.updateMany({
      where: { text: { contains: MARKER } },
      data: { approvedAt: new Date() },
    });

    const publiclyVisible = await db.prayerIntention.findMany({
      where: { approvedAt: { not: null }, text: { contains: MARKER } },
    });

    expect(publiclyVisible).toHaveLength(1);
  });

  it("rejects an empty or overlong intention", async () => {
    expect((await submitIntention({ status: "idle" }, form({ text: "  " }))).status).toBe(
      "error",
    );
    expect(
      (await submitIntention({ status: "idle" }, form({ text: "x".repeat(501) }))).status,
    ).toBe("error");

    expect(await db.prayerIntention.count({ where: { text: { contains: MARKER } } })).toBe(0);
  });

  it("stores an anonymous intention when no name is given", async () => {
    await submitIntention({ status: "idle" }, form({ text: `${MARKER} no name`, name: "" }));

    const row = await db.prayerIntention.findFirst({
      where: { text: { contains: MARKER } },
    });

    expect(row?.name).toBeNull();
  });

  it("ignores a campaign slug that does not exist rather than failing", async () => {
    const result = await submitIntention(
      { status: "idle" },
      form({ text: `${MARKER} bad slug`, campaignSlug: "no-such-appeal" }),
    );

    expect(result.status).toBe("success");

    const row = await db.prayerIntention.findFirst({
      where: { text: { contains: MARKER } },
    });
    expect(row?.campaignId).toBeNull();
  });

  it("will not increment the prayer count of an unapproved intention", async () => {
    await submitIntention({ status: "idle" }, form({ text: `${MARKER} unapproved` }));

    const row = await db.prayerIntention.findFirstOrThrow({
      where: { text: { contains: MARKER } },
    });

    await recordPrayer(row.id);

    const after = await db.prayerIntention.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.prayerCount).toBe(0);
  });

  it("increments the prayer count of an approved intention", async () => {
    await submitIntention({ status: "idle" }, form({ text: `${MARKER} approved` }));

    const row = await db.prayerIntention.findFirstOrThrow({
      where: { text: { contains: MARKER } },
    });
    await db.prayerIntention.update({
      where: { id: row.id },
      data: { approvedAt: new Date() },
    });

    await recordPrayer(row.id);
    await recordPrayer(row.id);

    const after = await db.prayerIntention.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.prayerCount).toBe(2);
  });
});
