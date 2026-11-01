import { type NoticeSource } from "@/lib/notice/card";
import { DELIGHT } from "@/lib/notice/content/delight";

function dayOfYear(ctx: { now: Date }): number {
  const start = Date.UTC(ctx.now.getUTCFullYear(), 0, 0);
  const diff = ctx.now.getTime() - start;
  return Math.floor(diff / 86_400_000);
}

export const delightSource: NoticeSource = async (ctx) => {
  const item = DELIGHT[dayOfYear(ctx) % DELIGHT.length];
  return [
    {
      id: `delight-${item.label}-${item.title.slice(0, 16)}`,
      kind: "delight",
      label: item.label,
      title: item.title,
      detail: item.detail,
      priority: 10,
    },
  ];
};
