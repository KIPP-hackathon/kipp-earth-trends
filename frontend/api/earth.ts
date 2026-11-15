import { createEarthHandler } from "../server/earthProxy.js";
import {
  cloudRunIdentityToken,
  cloudRunOrigin,
} from "../server/cloudRunAuth.js";

export default createEarthHandler(cloudRunIdentityToken, cloudRunOrigin);
