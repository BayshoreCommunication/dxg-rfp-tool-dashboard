export const CAMERA_PLAN_SPECIFIC = "Specific Camera Plan";
export const CAMERA_PLAN_VENDOR_RECOMMENDATION = "Vendor Recommendation";
export const CAMERA_TYPE_PTZ = "PTZ Camera";
export const CAMERA_TYPE_STUDIO = "Studio / Broadcast Camera";
export const CAMERA_TYPE_BOTH = "Both";
export const CAMERA_TYPE_OTHER = "Other — Specify";

export type CameraPlan = {
  cameras: string;
  camerasQty: string;
  cameraPlanMode: string;
  cameraType: string;
  ptzCameraQty: string;
  studioCameraQty: string;
  otherCameraType: string;
  otherCameraQty: string;
};

const positiveInteger = (value?: string): number =>
  /^\d+$/.test((value ?? "").trim()) && Number(value) > 0 ? Number(value) : 0;

export const cameraPlanTotal = (plan: CameraPlan): number => {
  if (plan.cameraPlanMode !== CAMERA_PLAN_SPECIFIC) return 0;
  if (plan.cameraType === CAMERA_TYPE_PTZ) return positiveInteger(plan.ptzCameraQty);
  if (plan.cameraType === CAMERA_TYPE_STUDIO) return positiveInteger(plan.studioCameraQty);
  if (plan.cameraType === CAMERA_TYPE_BOTH) {
    return positiveInteger(plan.ptzCameraQty) + positiveInteger(plan.studioCameraQty);
  }
  if (plan.cameraType === CAMERA_TYPE_OTHER) return positiveInteger(plan.otherCameraQty);
  return positiveInteger(plan.camerasQty);
};

export const cameraPlanMissingFields = (plan: CameraPlan): string[] => {
  if (plan.cameras !== "Yes") return [];
  if (!plan.cameraPlanMode) return ["camera plan"];
  if (plan.cameraPlanMode === CAMERA_PLAN_VENDOR_RECOMMENDATION) return [];
  const missing: string[] = [];
  if (!plan.cameraType) missing.push("camera type");
  if ([CAMERA_TYPE_PTZ, CAMERA_TYPE_BOTH].includes(plan.cameraType) && !positiveInteger(plan.ptzCameraQty)) missing.push("PTZ camera quantity");
  if ([CAMERA_TYPE_STUDIO, CAMERA_TYPE_BOTH].includes(plan.cameraType) && !positiveInteger(plan.studioCameraQty)) missing.push("studio camera quantity");
  if (plan.cameraType === CAMERA_TYPE_OTHER) {
    if (!plan.otherCameraType?.trim()) missing.push("other camera type");
    if (!positiveInteger(plan.otherCameraQty)) missing.push("other camera quantity");
  }
  return missing;
};

export const cameraPlanSummary = (plan: CameraPlan): string => {
  if (plan.cameras !== "Yes") return plan.cameras;
  if (plan.cameraPlanMode === CAMERA_PLAN_VENDOR_RECOMMENDATION) return CAMERA_PLAN_VENDOR_RECOMMENDATION;
  const total = cameraPlanTotal(plan) || positiveInteger(plan.camerasQty);
  const type = plan.cameraType === CAMERA_TYPE_OTHER ? plan.otherCameraType?.trim() : plan.cameraType;
  return [total ? `${total} camera${total === 1 ? "" : "s"}` : "Cameras required", type || "type not specified"].join(" — ");
};
