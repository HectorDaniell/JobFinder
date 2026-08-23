/**
 * @jobfinder/sources — adapters for INGESTION.
 *
 * Ingestion happens in two stages with opposite properties, so this package
 * holds two families that must not be confused (ADR-0029):
 *
 *   DISCOVER  — which jobs exist?   Alert emails, job boards with an API.
 *               Produces THIN jobs: no description, and that is expected.
 *   ENRICH    — what does it say?   The company's public ATS, its careers page,
 *               or the description the user captured by hand.
 *
 * Today only the email side of DISCOVER is here.
 */

// Email discovery: deterministic parsers, one per sender.
export { type EmailJobParser, type ParseOutcome, parseJobAlert, extractAddress } from './email';
