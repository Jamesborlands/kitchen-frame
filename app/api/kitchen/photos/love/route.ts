import { lovePost } from "@/lib/frame/loveAction";

export const dynamic = "force-dynamic";

// POST { id } — the frame's "❤️ Send a heart": a WhatsApp reaction on the sender's
// photo message (possible for 24h after it arrived). FRAME_KEY.
export const POST = (request: Request): Promise<Response> => lovePost(request);
