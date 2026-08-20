declare module 'promise/setimmediate/rejection-tracking' {
  export function enable(options: {
    allRejections?: boolean
    onUnhandled: (id: number, error: unknown) => void
    onHandled: (id: number) => void
  }): void
  export function disable(): void
}
