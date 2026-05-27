import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  isHeaderRow,
  parseCsvEntries,
  serializeCsvEntries,
  stripMarkdownFences,
  writeCsvEntries,
} from "./io"

const tempDirs: string[] = []

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-translator-io-test-"))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe("isHeaderRow", () => {
  it("detects standard ID/Text/Comment header", () => {
    expect(isHeaderRow(["ID", "Text", "Comment"])).toBe(true)
  })

  it("detects case-insensitive variants", () => {
    expect(isHeaderRow(["id", "text"])).toBe(true)
    expect(isHeaderRow(["Key", "Sentence", "ctx"])).toBe(true)
    expect(isHeaderRow(["ID", "Translation"])).toBe(true)
    expect(isHeaderRow(["KEY", "VALUE"])).toBe(true)
  })

  it("rejects non-header rows", () => {
    expect(isHeaderRow(["Bot.BeaversPerished", "Some text"])).toBe(false)
    expect(isHeaderRow(["ID"])).toBe(false)
    expect(isHeaderRow([])).toBe(false)
  })
})

describe("stripMarkdownFences", () => {
  it("strips csv code fences", () => {
    const input = "```csv\nline1\nline2\n```"
    expect(stripMarkdownFences(input)).toBe("line1\nline2")
  })

  it("strips generic code fences", () => {
    const input = "```\nline1\nline2\n```"
    expect(stripMarkdownFences(input)).toBe("line1\nline2")
  })

  it("strips fences with trailing newline", () => {
    const input = "```csv\nline1\nline2\n```\n"
    expect(stripMarkdownFences(input)).toBe("line1\nline2")
  })

  it("leaves plain text unchanged", () => {
    const input = "line1\nline2\n"
    expect(stripMarkdownFences(input)).toBe("line1\nline2\n")
  })

  it("leaves text with no closing fence unchanged", () => {
    const input = "no fences here\n"
    expect(stripMarkdownFences(input)).toBe("no fences here\n")
  })
})

describe("csv parser", () => {
  it("parses and serializes entries with multiline text", () => {
    const rawCsv =
      'Bot.BeaversPerished,"Ni tan sols em facis començar amb els castors.\n' +
      "Ho tenien tot. Aire fresc, aigua neta.\n" +
      'Ara només en queda un record llunyà.","Context sentence."\n'

    const entries = parseCsvEntries(rawCsv)

    expect(entries).toEqual([
      {
        key: "Bot.BeaversPerished",
        sentence:
          "Ni tan sols em facis començar amb els castors.\n" +
          "Ho tenien tot. Aire fresc, aigua neta.\n" +
          "Ara només en queda un record llunyà.",
        context: "Context sentence.",
      },
    ])

    const csvOut = serializeCsvEntries(entries)
    expect(csvOut).toContain("Bot.BeaversPerished")
    expect(csvOut).toContain("Context sentence.")
    expect(csvOut).toContain("Aire fresc, aigua neta.")
  })

  it("skips the header row when present", () => {
    const rawCsv =
      "ID,Text,Comment\n" +
      "k1,sentence one,ctx one\n" +
      "k2,sentence two,ctx two\n"

    const entries = parseCsvEntries(rawCsv)

    expect(entries).toHaveLength(2)
    expect(entries[0].key).toBe("k1")
    expect(entries[1].key).toBe("k2")
  })

  it("writes header row when provided to writeCsvEntries", () => {
    const dir = makeTempDir()
    const file = path.join(dir, "out.csv")
    const header = ["ID", "Text", "Comment"]
    const entries = [
      { key: "k1", sentence: "s1", context: "c1" },
      { key: "k2", sentence: "s2", context: "c2" },
    ]

    writeCsvEntries(file, entries, header)

    const content = fs.readFileSync(file, "utf8")
    expect(content).toMatch(/^ID,Text,Comment\n/u)
    expect(content).toContain("k1,s1,c1")
    expect(content).toContain("k2,s2,c2")
  })

  it("writeCsvEntries without header writes no header row", () => {
    const dir = makeTempDir()
    const file = path.join(dir, "out.csv")
    const entries = [{ key: "k1", sentence: "s1", context: "c1" }]

    writeCsvEntries(file, entries)

    const content = fs.readFileSync(file, "utf8")
    expect(content).toBe("k1,s1,c1\n")
  })
})
