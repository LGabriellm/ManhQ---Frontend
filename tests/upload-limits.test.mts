import test from "node:test";
import assert from "node:assert/strict";
import {
  assertLocalUploadFilesWithinLimit,
  splitLocalUploadBatches,
} from "../lib/upload-limits.ts";

const mib = (value: number) => value * 1024 * 1024;

function testFile(name: string, size: number): File {
  return { name, size } as File;
}

test("splitLocalUploadBatches keeps local batches below the byte cap", () => {
  const batches = splitLocalUploadBatches([
    testFile("one.cbz", mib(100)),
    testFile("two.cbz", mib(100)),
    testFile("three.cbz", mib(100)),
  ]);

  assert.deepEqual(
    batches.map((batch) => batch.map((file) => file.name)),
    [["one.cbz", "two.cbz"], ["three.cbz"]],
  );
});

test("splitLocalUploadBatches keeps local batches below the file count cap", () => {
  const batches = splitLocalUploadBatches(
    Array.from({ length: 7 }, (_, index) =>
      testFile(`${index + 1}.cbz`, mib(1)),
    ),
  );

  assert.deepEqual(
    batches.map((batch) => batch.length),
    [6, 1],
  );
});

test("assertLocalUploadFilesWithinLimit rejects an oversized local file", () => {
  assert.throws(
    () =>
      assertLocalUploadFilesWithinLimit([
        testFile("too-large.cbr", mib(513)),
      ]),
    /Limite por arquivo: 512 MB/,
  );
});
