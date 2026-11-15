import { createAssistantHandler } from "../server/assistantProxy.js";
import { cloudRunIdentityToken } from "../server/cloudRunAuth.js";

export default createAssistantHandler(
  cloudRunIdentityToken,
  "https://kipp-earth-trends-lab.vercel.app",
);
