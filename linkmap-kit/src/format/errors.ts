/** Every decoding failure is a LinkError. The UI shows a friendly "this link is damaged" message, never `message`. */
export class LinkError extends Error {
  constructor(
    readonly code: 'empty' | 'version' | 'base64' | 'flag' | 'inflate' | 'too-large' | 'malformed' | 'invalid' | 'sealed' | 'password',
    message: string,
  ) {
    super(message);
    this.name = 'LinkError';
  }
}
