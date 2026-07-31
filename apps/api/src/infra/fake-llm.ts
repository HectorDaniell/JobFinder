import type { Job, LlmPort, Profile, TailoredCv } from '@jobfinder/core';
import { ProfileHasNoBulletsError, type BulletProvider } from '@jobfinder/llm';

/**
 * LLM FALSO — solo para desarrollo sin ANTHROPIC_API_KEY.
 *
 * Se activa con USE_FAKE_LLM=true (ver infra.module.ts). Sustituye ÚNICAMENTE
 * la llamada a Claude: el resto del pipeline corre de verdad (perfil y bullets
 * salen de Postgres, y DocumentAdapter genera PDF/DOCX reales). Así se puede
 * probar el flujo completo —incluida la descarga— antes de tener créditos.
 *
 * Respeta el contrato del adapter real, incluidos sus errores de dominio
 * (ProfileHasNoBulletsError -> 422), para que la UI ejercite los mismos caminos.
 *
 * Borrar cuando ya no haga falta: no es parte del producto.
 */
export function createFakeLlm(bullets: BulletProvider): LlmPort {
  const notImplemented = (op: string) => async () => {
    throw new Error(`FakeLlm: ${op} no está implementado (solo tailoring)`);
  };

  return {
    extractJobs: notImplemented('extractJobs'),
    scoreJob: notImplemented('scoreJob'),

    async tailorCv(job: Job, profile: Profile, lang: 'es' | 'en'): Promise<TailoredCv> {
      const bank = await bullets.findByProfileId(profile.id);
      // Mismo guardrail que el adapter real: sin banco no hay nada que seleccionar.
      if (bank.length === 0) throw new ProfileHasNoBulletsError(profile.id);

      // "Selección" plausible: primero los bullets cuyas skills aparecen en la
      // descripción de la oferta. Nunca inventa texto: usa los bullets tal cual.
      const jd = job.description.toLowerCase();
      const scored = [...bank].sort((a, b) => matches(b, jd) - matches(a, jd));
      const selected = scored.slice(0, 6);

      const skills = [...new Set(selected.flatMap((b) => b.skills))];
      const keywords = skills.filter((s) => jd.includes(s.toLowerCase()));

      const header =
        lang === 'es'
          ? `Perfil adaptado para ${job.title} en ${job.company}.`
          : `Profile tailored for ${job.title} at ${job.company}.`;

      return {
        content: `${header}\n\n${lang === 'es' ? profile.summaryEs : profile.summaryEn}`,
        bullets: selected.map((b) => b.getText(lang)),
        keywords: keywords.length > 0 ? keywords : skills.slice(0, 5),
      };
    },

    async tailorCoverLetter(job: Job, profile: Profile, lang: 'es' | 'en'): Promise<string> {
      const bank = await bullets.findByProfileId(profile.id);
      const highlight = bank[0]?.getText(lang) ?? '';

      if (lang === 'es') {
        return [
          `Estimado equipo de ${job.company}:`,
          `Les escribo para postular a la posición de ${job.title}. ${profile.summaryEs}`,
          highlight && `Un ejemplo concreto de mi trabajo: ${highlight}`,
          `Quedo a disposición para conversar sobre cómo puedo aportar al equipo.`,
          `Atentamente,\n${profile.fullName}`,
        ]
          .filter(Boolean)
          .join('\n\n');
      }

      return [
        `Dear ${job.company} team,`,
        `I'm writing to apply for the ${job.title} position. ${profile.summaryEn}`,
        highlight && `A concrete example of my work: ${highlight}`,
        `I'd be glad to discuss how I can contribute to the team.`,
        `Best regards,\n${profile.fullName}`,
      ]
        .filter(Boolean)
        .join('\n\n');
    },
  };
}

/** Cuántas skills del bullet aparecen en la descripción de la vacante. */
function matches(bullet: { skills: string[] }, jobDescription: string): number {
  return bullet.skills.filter((s) => jobDescription.includes(s.toLowerCase())).length;
}
