# Office-to-Personal Laptop Transfer Checklist

## Before transfer

- Confirm company policy permits transfer of the product-planning documents.
- Confirm no company credentials, API keys, AWS keys, payment secrets, or personal/student data are present.
- Keep the transfer archive private and encrypted in transit.
- Record the archive checksum.

## On the personal laptop

1. Extract the archive into a private development folder.
2. Read `PROJECT_HANDOFF.md`.
3. Verify the archive checksum.
4. Confirm the handoff contains no source documents, runtime databases, or credentials.
5. Initialize a new private Git repository after reviewing `.gitignore`.
6. Add future secrets only through `.env`; never commit them.

## Recommended first commit

Commit the handoff documents and future source code. Exclude:

- `.env*`
- credentials and secrets
- runtime data and uploads
- transfer ZIP files
- logs, caches, and temporary files

## Archive verification

Compare the SHA-256 value supplied with the transfer archive. A different checksum means the file is incomplete or changed.
