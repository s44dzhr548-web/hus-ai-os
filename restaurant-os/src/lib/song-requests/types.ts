import type { SongRequestStatus, SongRequestTarget } from "@prisma/client";

export const SONG_TARGET_LABELS_AR: Record<SongRequestTarget, string> = {
  SAME_TABLE: "نفس الطاولة",
  OTHER_TABLE: "طاولة أخرى",
  WHOLE_RESTAURANT: "للمطعم كاملًا",
};

export const SONG_STATUS_LABELS_AR: Record<SongRequestStatus, string> = {
  PENDING_REVIEW: "قيد المراجعة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  PLAYING: "قيد التشغيل",
  PLAYED: "تم التشغيل",
};

export const SONG_TARGETS: SongRequestTarget[] = [
  "SAME_TABLE",
  "OTHER_TABLE",
  "WHOLE_RESTAURANT",
];
