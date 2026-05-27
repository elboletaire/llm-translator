export interface TranslationEntry {
  key: string
  sentence: string
  context: string
}

export type InputFormat = "plain" | "csv3" | "json"

export interface CliArgs {
  inputFile: string
  outputFile: string
  setupContext: string
  setupContextFile?: string
  batchSize: number
  inputFormat: InputFormat
  timeoutSeconds: number
  piCmd: string
  provider?: string
  model?: string
  apiKey?: string
  stdinEndToken: string
}
