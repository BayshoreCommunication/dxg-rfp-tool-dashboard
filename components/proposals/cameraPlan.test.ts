import {
  CAMERA_PLAN_SPECIFIC,
  CAMERA_PLAN_VENDOR_RECOMMENDATION,
  CAMERA_TYPE_BOTH,
  CAMERA_TYPE_OTHER,
  cameraPlanMissingFields,
  cameraPlanSummary,
  cameraPlanTotal,
  type CameraPlan,
} from "./cameraPlan";

const plan = (patch: Partial<CameraPlan> = {}): CameraPlan => ({
  cameras: "Yes", camerasQty: "", cameraPlanMode: CAMERA_PLAN_SPECIFIC,
  cameraType: CAMERA_TYPE_BOTH, ptzCameraQty: "2", studioCameraQty: "3",
  otherCameraType: "", otherCameraQty: "", ...patch,
});

test("Both derives a total from independent PTZ and studio quantities", () => {
  expect(cameraPlanTotal(plan())).toBe(5);
  expect(cameraPlanMissingFields(plan())).toEqual([]);
});

test("vendor recommendation completes the plan without a fabricated count", () => {
  const value = plan({ cameraPlanMode: CAMERA_PLAN_VENDOR_RECOMMENDATION, cameraType: "", ptzCameraQty: "", studioCameraQty: "" });
  expect(cameraPlanTotal(value)).toBe(0);
  expect(cameraPlanMissingFields(value)).toEqual([]);
  expect(cameraPlanSummary(value)).toBe(CAMERA_PLAN_VENDOR_RECOMMENDATION);
});

test("Other requires its description and positive quantity", () => {
  const value = plan({ cameraType: CAMERA_TYPE_OTHER, ptzCameraQty: "", studioCameraQty: "", otherCameraType: "", otherCameraQty: "0" });
  expect(cameraPlanMissingFields(value)).toEqual(["other camera type", "other camera quantity"]);
});

test("legacy quantities still render meaningfully", () => {
  expect(cameraPlanSummary(plan({ cameraType: "", camerasQty: "4", ptzCameraQty: "", studioCameraQty: "" }))).toBe("4 cameras — type not specified");
});
