/** biome-ignore-all lint/style/noMagicNumbers: <tests> */
import { describe, expect, test } from "bun:test";
import { toObjectArray } from "./sheets";

describe("toObjectArray", () => {
  test("converts 2D array to object array with provided header", () => {
    const data = [
      ["Alice", 30],
      ["Bob", 25],
    ];
    const header = ["name", "age"];

    const result = toObjectArray(data, header);

    expect(result).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });

  test("uses first row as header when not provided", () => {
    const data = [
      ["name", "age"],
      ["Alice", 30],
      ["Bob", 25],
    ];

    const result = toObjectArray(data);

    expect(result).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });

  test("handles missing values", () => {
    const data = [["Alice", 30, "Engineer"], ["Bob"]];
    const header = ["name", "age", "job"];

    const result = toObjectArray(data, header);

    expect(result).toEqual([
      { name: "Alice", age: 30, job: "Engineer" },
      { name: "Bob", age: undefined, job: undefined },
    ]);
  });
});
