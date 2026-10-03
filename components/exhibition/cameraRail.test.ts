import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLOSE_UP_FACTOR,
  EYE_Y,
  INTRO_POSE,
  VERTICAL_FOV,
  closeUpPanRange,
  damp,
  dampPose,
  fitDistance,
  isSettled,
  paintingPose,
  panRangeForStop,
  poseForStop,
} from "./cameraRail.ts";
import { layoutPaintings } from "./roomLayout.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

const placements = layoutPaintings([1.41, 0.71, 1.26]);
const DESKTOP = 16 / 9;
const PHONE = 9 / 19;

describe("fitDistance", () => {
  it("shows the whole painting on a wide viewport", () => {
    const { width, height } = placements[0];
    const d = fitDistance(width, height, DESKTOP);
    const visibleHeight = 2 * d * Math.tan((VERTICAL_FOV * Math.PI) / 360);
    assert.ok(visibleHeight >= height);
    assert.ok(visibleHeight * DESKTOP >= width);
  });
  it("stands further back on a narrow viewport", () => {
    const { width, height } = placements[0];
    assert.ok(fitDistance(width, height, PHONE) > fitDistance(width, height, DESKTOP));
  });
  it("stays inside the hall", () => {
    const d = fitDistance(100, 100, PHONE);
    assert.ok(d >= 2.6 && d <= 7.5);
  });
});

describe("paintingPose", () => {
  it("stands in front of a left-wall painting, looking at it", () => {
    const p = placements[0];
    const pose = paintingPose(p, 3);
    close(pose.position[0], p.position[0] + 3);
    close(pose.position[1], EYE_Y);
    close(pose.position[2], p.position[2]);
    assert.deepEqual(pose.target, p.position);
  });
  it("stands in front of a right-wall painting, looking at it", () => {
    const p = placements[1];
    const pose = paintingPose(p, 3);
    close(pose.position[0], p.position[0] - 3);
    close(pose.position[2], p.position[2]);
    assert.deepEqual(pose.target, p.position);
  });
});

describe("poseForStop", () => {
  it("stop 0 is the entrance", () => {
    assert.deepEqual(poseForStop(0, placements, DESKTOP, false), INTRO_POSE);
  });
  it("stop 1 looks at the first painting's hanging, picture and label together", () => {
    const p = placements[0];
    const pose = poseForStop(1, placements, DESKTOP, false);
    close(pose.target[0], p.position[0]);
    close(pose.target[1], p.position[1] - p.focusDrop);
    close(pose.target[2], p.position[2]);
  });
  it("the full view shows the label as well as the picture", () => {
    const p = placements[1];
    const pose = poseForStop(2, placements, DESKTOP, false);
    const d = Math.abs(pose.position[0] - pose.target[0]);
    const visibleHeight = 2 * d * Math.tan((VERTICAL_FOV * Math.PI) / 360);
    assert.ok(visibleHeight >= p.fitHeight);
  });
  it("the close-up looks at the picture's centre", () => {
    const p = placements[0];
    const pose = poseForStop(1, placements, DESKTOP, true);
    assert.deepEqual(pose.target, p.position);
  });
  it("the close-up is nearer by CLOSE_UP_FACTOR", () => {
    const far = poseForStop(2, placements, DESKTOP, false);
    const near = poseForStop(2, placements, DESKTOP, true);
    const distance = (pose: { position: number[]; target: number[] }) =>
      Math.abs(pose.position[0] - pose.target[0]);
    close(distance(near), distance(far) * CLOSE_UP_FACTOR);
  });
});

describe("damp", () => {
  it("stays put when no time passes", () => close(damp(5, 10, 0, 4), 5));
  it("reaches the goal given long enough", () => assert.ok(Math.abs(damp(5, 10, 100, 4) - 10) < 1e-6));
  it("moves part of the way in between", () => {
    const v = damp(5, 10, 0.1, 4);
    assert.ok(v > 5 && v < 10);
  });
  it("works downward too", () => {
    const v = damp(10, 5, 0.1, 4);
    assert.ok(v < 10 && v > 5);
  });
});

describe("isSettled", () => {
  it("is true for identical poses", () => assert.ok(isSettled(INTRO_POSE, INTRO_POSE)));
  it("is true when the difference is invisible", () => {
    const near = { position: [0, EYE_Y, 1.5001], target: [0, 1.7, 14] } as typeof INTRO_POSE;
    assert.ok(isSettled(INTRO_POSE, near));
  });
  it("is false while the camera position is still travelling", () => {
    const far = poseForStop(1, placements, DESKTOP, false);
    assert.ok(!isSettled(INTRO_POSE, far));
  });
  it("is false while only the look-at point is still turning", () => {
    const turning = { position: INTRO_POSE.position, target: [0.5, 1.7, 14] } as typeof INTRO_POSE;
    assert.ok(!isSettled(INTRO_POSE, turning));
  });
});

describe("closeUpPanRange", () => {
  const painting = placements[0];

  it("is zero when the whole picture fits the view", () => {
    assert.deepEqual(closeUpPanRange(painting, 20, DESKTOP), { x: 0, y: 0 });
  });
  it("is positive on an axis where the picture overflows the view", () => {
    const range = closeUpPanRange(painting, 1.5, DESKTOP);
    assert.ok(range.y > 0);
  });
  it("lets the camera reach the picture's edge, a little past it", () => {
    const distance = 1.5;
    const visibleHeight = 2 * distance * Math.tan((VERTICAL_FOV * Math.PI) / 360);
    const { y } = closeUpPanRange(painting, distance, DESKTOP);
    // Panned all the way, the view's edge sits beyond the picture's edge.
    assert.ok(visibleHeight / 2 - y <= painting.height / 2);
  });
  it("grows as the camera moves closer", () => {
    const near = closeUpPanRange(painting, 1.2, DESKTOP);
    const far = closeUpPanRange(painting, 1.8, DESKTOP);
    assert.ok(near.x >= far.x);
    assert.ok(near.y > far.y);
  });
  it("needs more sideways pan on a narrow screen", () => {
    const phone = closeUpPanRange(painting, 3, PHONE);
    const desktop = closeUpPanRange(painting, 3, DESKTOP);
    assert.ok(phone.x > desktop.x);
  });
});

describe("panRangeForStop", () => {
  it("is zero outside the close-up", () => {
    assert.deepEqual(panRangeForStop(1, placements, DESKTOP, false), { x: 0, y: 0 });
  });
  it("is zero at the entrance", () => {
    assert.deepEqual(panRangeForStop(0, placements, DESKTOP, true), { x: 0, y: 0 });
  });
  it("lets the close-up on a painting move around it", () => {
    const range = panRangeForStop(1, placements, DESKTOP, true);
    assert.ok(range.x >= 0);
    assert.ok(range.y > 0);
  });
  it("matches the close-up camera's distance", () => {
    const pose = poseForStop(1, placements, DESKTOP, true);
    const distance = Math.abs(pose.position[0] - pose.target[0]);
    assert.deepEqual(
      panRangeForStop(1, placements, DESKTOP, true),
      closeUpPanRange(placements[0], distance, DESKTOP),
    );
  });
});

describe("dampPose", () => {
  it("moves position and target toward the goal", () => {
    const goal = poseForStop(1, placements, DESKTOP, false);
    const next = dampPose(INTRO_POSE, goal, 0.1, 4);
    assert.ok(next.position[2] > INTRO_POSE.position[2]);
    assert.ok(next.position[2] < goal.position[2]);
    assert.ok(next.target[0] < INTRO_POSE.target[0]);
  });
});
