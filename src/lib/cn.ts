/** Junta classes condicionais. */
export const cn = (...cls: (string | false | null | undefined)[]): string => cls.filter(Boolean).join(' ');
