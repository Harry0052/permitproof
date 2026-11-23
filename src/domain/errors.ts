export class PermitProofError extends Error {
  readonly code: string;
  readonly details: string[];

  constructor(code: string, message: string, details: string[] = []) {
    super(message);
    this.name = "PermitProofError";
    this.code = code;
    this.details = details;
  }
}

export function formatError(error: PermitProofError): string {
  const lines = [`error: ${error.code}`, error.message];
  for (const detail of error.details) {
    lines.push(`- ${detail}`);
  }
  return `${lines.join("\n")}\n`;
}
