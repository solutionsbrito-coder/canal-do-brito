import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChannelLogoUpload } from "../ChannelLogoUpload";

const mocks = vi.hoisted(() => ({
  upload: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mocks.upload,
        getPublicUrl: () => ({ data: { publicUrl: "https://cdn/test.png" } }),
      }),
    },
  },
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

// jsdom lacks createImageBitmap/canvas — pass through original file.
vi.mock("@/lib/normalizeLogo", () => ({
  normalizeLogoFile: vi.fn(async (f: File) => f),
}));

describe("ChannelLogoUpload", () => {
  beforeEach(() => {
    mocks.upload.mockClear();
    toastMock.error.mockClear();
    toastMock.success.mockClear();
  });

  const setup = () => {
    const onUploaded = vi.fn();
    render(<ChannelLogoUpload channelName="ESPN" onUploaded={onUploaded} />);
    return { onUploaded };
  };

  const fileInput = () =>
    document.querySelector('input[type="file"]') as HTMLInputElement;

  it("rejects unsupported mime type", async () => {
    const { onUploaded } = setup();
    const bad = new File(["x"], "x.gif", { type: "image/gif" });
    fireEvent.change(fileInput(), { target: { files: [bad] } });
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("rejects files larger than 400KB", async () => {
    const { onUploaded } = setup();
    const big = new File([new Uint8Array(500 * 1024)], "x.png", { type: "image/png" });
    fireEvent.change(fileInput(), { target: { files: [big] } });
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("uploads valid PNG and emits public URL", async () => {
    const { onUploaded } = setup();
    const ok = new File([new Uint8Array(100)], "logo.png", { type: "image/png" });
    fireEvent.change(fileInput(), { target: { files: [ok] } });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith("https://cdn/test.png"));
    expect(mocks.upload).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
  });

  it("renders current logo preview when provided", () => {
    render(
      <ChannelLogoUpload
        channelName="ESPN"
        currentUrl="https://cdn/cur.png"
        onUploaded={vi.fn()}
        onCleared={vi.fn()}
      />
    );
    expect(screen.getByAltText("Logo atual")).toBeInTheDocument();
    expect(screen.getByText(/Remover logo personalizada/i)).toBeInTheDocument();
  });
});
