// Minimal self-contained ZIP reader/writer for the doc-tools Code Plugin.
// Uses only node:zlib (raw deflate/inflate), so the packaged Code Plugin keeps
// archive operations self-contained without a native ZIP dependency.

import { deflateRawSync, inflateRawSync } from "node:zlib";

const ZIP32_SENTINEL = 0xffffffff;
const MAX_ZIP_ENTRIES = 20_000;
const MAX_ENTRY_UNCOMPRESSED_BYTES = 32 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 256 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 200;

export type ZipEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  crc32: number;
  localHeaderOffset: number;
  isDirectory: boolean;
};

export type ZipFile = {
  entries: ZipEntry[];
  readEntry(entryName: string): Buffer | undefined;
  replaceEntry(entryName: string, content: Buffer): Buffer;
  addEntry(entryName: string, content: Buffer): Buffer;
};

type CentralEntry = ZipEntry & {
  nameBuffer: Buffer;
  extra: Buffer;
  comment: Buffer;
  flags: number;
  versionMadeBy: number;
  versionNeeded: number;
  modTime: number;
  modDate: number;
  externalAttributes: number;
};

export function openZip(buffer: Buffer): ZipFile {
  const entries = parseCentralDirectory(buffer);
  return {
    entries,
    readEntry(entryName) {
      const entry = entries.find((candidate) => candidate.name === entryName);
      return entry ? readZipEntry(buffer, entry) : undefined;
    },
    replaceEntry(entryName, content) {
      const map = new Map<string, Buffer>();
      for (const entry of entries) {
        const existing = readZipEntry(buffer, entry);
        if (existing) {
          map.set(entry.name, existing);
        }
      }
      map.set(entryName, content);
      return createZip([...map.entries()].map(([name, data]) => ({ name, data })));
    },
    addEntry(entryName, content) {
      return this.replaceEntry(entryName, content);
    }
  };
}

export function createZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  if (files.length > 0xffff) {
    throw new Error("ZIP32 archives support at most 65535 entries.");
  }
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const names = new Set<string>();
  let offset = 0;

  for (const file of files) {
    const name = normalizeZipName(file.name);
    assertSafeZipName(name);
    const identity = name.toLowerCase();
    if (names.has(identity)) {
      throw new Error(`Duplicate ZIP entry name: ${name}.`);
    }
    names.add(identity);
    const nameBuffer = Buffer.from(name, "utf8");
    if (nameBuffer.length > 0xffff) {
      throw new Error(`ZIP entry name is too long: ${name.slice(0, 120)}.`);
    }
    if (file.data.length > ZIP32_SENTINEL) {
      throw new Error(`ZIP entry is too large for ZIP32: ${name}.`);
    }
    const compressed = deflateRawSync(file.data);
    if (compressed.length > ZIP32_SENTINEL || offset > ZIP32_SENTINEL) {
      throw new Error("ZIP archive is too large for ZIP32.");
    }
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);

    offset += local.length + nameBuffer.length + compressed.length;
  }

  const centralOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function parseCentralDirectory(buffer: Buffer): CentralEntry[] {
  if (buffer.length < 22) {
    throw new Error("ZIP archive is truncated.");
  }
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) {
    throw new Error("ZIP end of central directory was not found.");
  }

  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDisk = buffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralSize = buffer.readUInt32LE(eocdOffset + 12);
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error("Multi-disk ZIP archives are not supported.");
  }
  if (entryCount === 0xffff || centralSize === ZIP32_SENTINEL || centralOffset === ZIP32_SENTINEL) {
    throw new Error("ZIP64 archives are not supported.");
  }
  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new Error(`ZIP archive exceeds the ${MAX_ZIP_ENTRIES} entry limit.`);
  }
  if (centralOffset + centralSize > eocdOffset || centralOffset > buffer.length) {
    throw new Error("ZIP central directory is outside the archive bounds.");
  }
  const entries: CentralEntry[] = [];
  const names = new Set<string>();
  let totalUncompressedBytes = 0;
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    assertRange(buffer, offset, 46, "ZIP central directory entry");
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory entry at ${offset}.`);
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const recordLength = 46 + nameLength + extraLength + commentLength;
    assertRange(buffer, offset, recordLength, "ZIP central directory entry");
    const nameBuffer = buffer.subarray(offset + 46, offset + 46 + nameLength);
    const name = nameBuffer.toString("utf8");
    assertSafeZipName(name);
    const identity = name.toLowerCase();
    if (names.has(identity)) {
      throw new Error(`ZIP archive contains a duplicate entry name: ${name}.`);
    }
    names.add(identity);
    const extra = buffer.subarray(offset + 46 + nameLength, offset + 46 + nameLength + extraLength);
    const comment = buffer.subarray(offset + 46 + nameLength + extraLength, offset + 46 + nameLength + extraLength + commentLength);
    const flags = buffer.readUInt16LE(offset + 8);
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    if ((flags & 0x0001) !== 0) {
      throw new Error(`Encrypted ZIP entries are not supported: ${name}.`);
    }
    if (compressedSize === ZIP32_SENTINEL || uncompressedSize === ZIP32_SENTINEL || localHeaderOffset === ZIP32_SENTINEL) {
      throw new Error(`ZIP64 entry is not supported: ${name}.`);
    }
    if (compressionMethod !== 0 && compressionMethod !== 8) {
      throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${name}.`);
    }
    if (uncompressedSize > MAX_ENTRY_UNCOMPRESSED_BYTES) {
      throw new Error(`ZIP entry ${name} exceeds the ${MAX_ENTRY_UNCOMPRESSED_BYTES} byte extraction limit.`);
    }
    if (uncompressedSize > 0 && compressedSize === 0) {
      throw new Error(`ZIP entry ${name} has an invalid compressed size.`);
    }
    if (compressedSize > 0 && uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO) {
      throw new Error(`ZIP entry ${name} exceeds the ${MAX_COMPRESSION_RATIO}:1 compression-ratio limit.`);
    }
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error(`ZIP archive exceeds the ${MAX_TOTAL_UNCOMPRESSED_BYTES} byte uncompressed-size limit.`);
    }
    entries.push({
      name,
      nameBuffer,
      extra,
      comment,
      versionMadeBy: buffer.readUInt16LE(offset + 4),
      versionNeeded: buffer.readUInt16LE(offset + 6),
      flags,
      compressionMethod,
      modTime: buffer.readUInt16LE(offset + 12),
      modDate: buffer.readUInt16LE(offset + 14),
      crc32: buffer.readUInt32LE(offset + 16),
      compressedSize,
      uncompressedSize,
      externalAttributes: buffer.readUInt32LE(offset + 38),
      localHeaderOffset,
      isDirectory: name.endsWith("/")
    });
    offset += recordLength;
  }

  if (offset !== centralOffset + centralSize) {
    throw new Error("ZIP central directory size does not match its entries.");
  }

  return entries;
}

function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer | undefined {
  if (entry.isDirectory) {
    return Buffer.alloc(0);
  }
  const offset = entry.localHeaderOffset;
  assertRange(buffer, offset, 30, `ZIP local file header for ${entry.name}`);
  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local file header for ${entry.name}.`);
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  assertRange(buffer, dataStart, entry.compressedSize, `ZIP entry data for ${entry.name}`);
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  let output: Buffer;
  if (entry.compressionMethod === 0) {
    output = Buffer.from(compressed);
  } else if (entry.compressionMethod === 8) {
    output = inflateRawSync(compressed, { maxOutputLength: Math.min(MAX_ENTRY_UNCOMPRESSED_BYTES, entry.uncompressedSize + 1) });
  } else {
    throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entry.name}.`);
  }
  if (output.length !== entry.uncompressedSize) {
    throw new Error(`ZIP entry size mismatch for ${entry.name}.`);
  }
  if (crc32(output) !== entry.crc32) {
    throw new Error(`ZIP entry CRC mismatch for ${entry.name}.`);
  }
  return output;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  return -1;
}

function normalizeZipName(name: string): string {
  return name.replaceAll("\\", "/").replace(/^\/+/, "");
}

function assertSafeZipName(name: string): void {
  if (
    !name
    || name.includes("\0")
    || name.startsWith("/")
    || /^[A-Za-z]:/.test(name)
    || name.split("/").some((part) => part === ".." || part === ".")
  ) {
    throw new Error(`Unsafe ZIP entry name: ${name || "(empty)"}.`);
  }
}

function assertRange(buffer: Buffer, offset: number, length: number, label: string): void {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`${label} is outside the archive bounds.`);
  }
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
