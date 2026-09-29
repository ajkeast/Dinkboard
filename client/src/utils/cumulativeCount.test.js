import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cumulativeCountAt } from "./cumulativeCount.js";

describe("cumulativeCountAt", () => {
  const ada = [
    { timesent: 100, cum_count: 1 },
    { timesent: 300, cum_count: 2 },
    { timesent: 500, cum_count: 3 },
  ];
  const bea = [
    { timesent: 200, cum_count: 1 },
    { timesent: 400, cum_count: 2 },
  ];

  it("is 0 before a user has any firsts", () => {
    assert.equal(cumulativeCountAt(ada, 99), 0);
    assert.equal(cumulativeCountAt(bea, 150), 0);
  });

  it("returns that user's own total on an exact event", () => {
    assert.equal(cumulativeCountAt(ada, 300), 2);
    assert.equal(cumulativeCountAt(bea, 300), 1);
  });

  it("carries each user's last total between events", () => {
    assert.equal(cumulativeCountAt(ada, 450), 2);
    assert.equal(cumulativeCountAt(bea, 450), 2);
    assert.notEqual(cumulativeCountAt(ada, 450), cumulativeCountAt(bea, 250));
  });

  it("does not copy the leader's score onto other users", () => {
    const day = 500;
    const adaScore = cumulativeCountAt(ada, day);
    const beaScore = cumulativeCountAt(bea, day);
    assert.equal(adaScore, 3);
    assert.equal(beaScore, 2);
    assert.notEqual(adaScore, beaScore);
  });

  it("keeps the final total after the last event", () => {
    assert.equal(cumulativeCountAt(ada, 900), 3);
    assert.equal(cumulativeCountAt(bea, 900), 2);
  });

  it("uses the latest count when timestamps tie", () => {
    const points = [
      { timesent: 10, cum_count: 1 },
      { timesent: 10, cum_count: 2 },
    ];
    assert.equal(cumulativeCountAt(points, 10), 2);
  });

  it("handles empty and invalid input", () => {
    assert.equal(cumulativeCountAt([], 10), 0);
    assert.equal(cumulativeCountAt(null, 10), 0);
    assert.equal(cumulativeCountAt(ada, "nope"), 0);
    assert.equal(
      cumulativeCountAt([{ timesent: "200", cum_count: "4" }], "250"),
      4
    );
  });
});
