# V2.5 Git export checks

## Performed

- Original archive ZIP CRC integrity: passed.
- Imported all 100 source files; no original source file deleted.
- Imported source commit/tag preserves all original file bytes.
- Runtime JavaScript, CSS, HTML, JSON study/questionnaire/material configs, images,
  Netlify configuration, dependency declaration, database migrations and existing tests: unchanged.
- `npm test`: 32 passed, 0 failed, 0 skipped, under Node.js 22.16.0.
- `npm run build`: completed in a disposable source copy, including config sync,
  existing validation and material-manifest generation. Three original release warnings
  remain: researcher_contact, contact_email, ethics_approval are not supplied.
- Pattern scan: no matches for common GitHub tokens, private-key headers, AWS key IDs,
  or credential-bearing database URLs in UTF-8 source files.
- No actual `.env` or participant-answer exports included. Existing `.env.example`
  uses a placeholder. Existing local test tokens remain confined to synthetic test code.

## Repository-only changes

- Extend `.gitignore` for private environment files and research-data exports.
- Add `.gitattributes` to preserve source bytes and existing stimulus hashes.
- Add `REPOSITORY_GUIDE.md` and `repository_export/` provenance/QA records.
- Regenerate `FILE_MANIFEST.json` for repository packaging.

## Not performed / not implied

No external dependency installation, production Netlify deployment, real PostgreSQL
concurrency test, real mobile session, Credamo/jsPsych migration, browser E2E test,
independent penetration test, or new human manipulation validation.

This is a source-to-Git packaging operation. It intentionally does not implement
subsequent methodological and technical changes discussed after V2.5 was produced.
The basic pattern scan is not a guarantee that every possible secret or sensitive
content has been detected. Review all changes before publishing.

Git fsck, bundle verification and fresh clone testing are performed at final packaging
and recorded in the delivery-level verification report.
