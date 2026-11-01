import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extFromContentType,
  fetchWhatsAppMedia,
  ingestWhatsAppPhoto,
  type PhotoPut,
} from "@/lib/frame/media";
import { getFrame, __resetFrameForTest } from "@/lib/frame/store";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Response;
}

function binaryResponse(contentType: string | null, ok = true, status = 200) {
  return {
    ok,
    status,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? contentType : null) },
  } as unknown as Response;
}

describe("extFromContentType", () => {
  it("maps known image types and defaults to jpg", () => {
    expect(extFromContentType("image/png")).toBe("png");
    expect(extFromContentType("image/webp")).toBe("webp");
    expect(extFromContentType("image/gif")).toBe("gif");
    expect(extFromContentType("image/jpeg")).toBe("jpg");
    expect(extFromContentType("application/octet-stream")).toBe("jpg");
  });
});

describe("fetchWhatsAppMedia", () => {
  it("resolves the media URL then downloads the bytes", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ url: "https://media.example/x", mime_type: "image/png" }))
      .mockResolvedValueOnce(binaryResponse("image/png"));

    const { bytes, contentType } = await fetchWhatsAppMedia("MID", "tok", fetchImpl as unknown as typeof fetch);

    expect(contentType).toBe("image/png");
    expect(new Uint8Array(bytes)).toEqual(new Uint8Array([1, 2, 3]));
    // first call hits the graph metadata endpoint with a bearer token
    expect(fetchImpl.mock.calls[0][0]).toContain("/MID");
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
    // second call downloads the resolved url
    expect(fetchImpl.mock.calls[1][0]).toBe("https://media.example/x");
  });

  it("throws when the metadata response is not ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 404));
    await expect(fetchWhatsAppMedia("MID", "tok", fetchImpl as unknown as typeof fetch)).rejects.toThrow();
  });

  it("throws when the metadata has no url", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ mime_type: "image/jpeg" }));
    await expect(fetchWhatsAppMedia("MID", "tok", fetchImpl as unknown as typeof fetch)).rejects.toThrow();
  });

  it("throws when the binary download is not ok", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ url: "https://media.example/x" }))
      .mockResolvedValueOnce(binaryResponse(null, false, 500));
    await expect(fetchWhatsAppMedia("MID", "tok", fetchImpl as unknown as typeof fetch)).rejects.toThrow();
  });
});

describe("ingestWhatsAppPhoto", () => {
  beforeEach(async () => {
    await __resetFrameForTest();
  });

  it("returns null when storage isn't configured (no tokens)", async () => {
    const put = vi.fn();
    const result = await ingestWhatsAppPhoto({ id: "MID" }, "Kate", { put: put as unknown as PhotoPut });
    expect(result).toBeNull();
    expect(put).not.toHaveBeenCalled();
  });

  it("returns null when there's no R2 bucket bound", async () => {
    const fetchImpl = vi.fn();
    const result = await ingestWhatsAppPhoto({ id: "MID" }, "Kate", { fetchImpl: fetchImpl as unknown as typeof fetch, token: "wa" });
    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("downloads, stores in R2, and records the photo in the frame store", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ url: "https://media.example/x", mime_type: "image/jpeg" }))
      .mockResolvedValueOnce(binaryResponse("image/jpeg"));
    const put = vi.fn().mockResolvedValue(undefined);

    const url = await ingestWhatsAppPhoto(
      { id: "MID", caption: "morning swim" },
      "Kate",
      { fetchImpl: fetchImpl as unknown as typeof fetch, put: put as unknown as PhotoPut, token: "wa" },
    );

    expect(url).toBe("/api/photo?k=whatsapp%2FMID.jpg");
    expect(put).toHaveBeenCalledWith("whatsapp/MID.jpg", expect.anything(), "image/jpeg");
    const frame = await getFrame();
    expect(frame.photos[0]).toMatchObject({
      url: "/api/photo?k=whatsapp%2FMID.jpg",
      from: "Kate",
      caption: "morning swim",
    });
  });

  it("keeps the WhatsApp sender and message id so the photo can be ❤️'d", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ url: "https://media.example/x", mime_type: "image/jpeg" }))
      .mockResolvedValueOnce(binaryResponse("image/jpeg"));
    const put = vi.fn().mockResolvedValue(undefined);
    await ingestWhatsAppPhoto(
      { id: "MID2" },
      "Kate",
      { fetchImpl: fetchImpl as unknown as typeof fetch, put: put as unknown as PhotoPut, token: "wa" },
      { waFrom: "447700900000", waMessageId: "wamid.1" },
    );
    expect((await getFrame()).photos[0]).toMatchObject({ waFrom: "447700900000", waMessageId: "wamid.1" });
  });

  it("returns null and stores nothing when the download fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    const put = vi.fn();
    const url = await ingestWhatsAppPhoto({ id: "MID" }, "Kate", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      put: put as unknown as PhotoPut,
      token: "wa",
    });
    expect(url).toBeNull();
    expect(put).not.toHaveBeenCalled();
    expect((await getFrame()).photos).toHaveLength(0);
  });

  it("returns null when the R2 upload throws", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ url: "https://media.example/x" }))
      .mockResolvedValueOnce(binaryResponse("image/jpeg"));
    const put = vi.fn().mockRejectedValue(new Error("r2 down"));
    const url = await ingestWhatsAppPhoto({ id: "MID" }, "Kate", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      put: put as unknown as PhotoPut,
      token: "wa",
    });
    expect(url).toBeNull();
    expect((await getFrame()).photos).toHaveLength(0);
  });
});
