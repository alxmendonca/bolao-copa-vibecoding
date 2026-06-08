/** Ajuste aqui ou via VITE_SUBMISSION_DEADLINE no build/deploy. */
export const BOLAO_CONFIG = {
  submissionDeadline:
    import.meta.env.VITE_SUBMISSION_DEADLINE?.trim() || "11/06/2026",
};
