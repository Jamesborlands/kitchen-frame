import { lovePost } from "@/lib/frame/loveAction";

export const dynamic = "force-dynamic";

// POST { id } — ❤️ a photo from the kitchen. Sits behind the site PIN (middleware.ts).
export const POST = (request: Request): Promise<Response> => lovePost(request);
