import { createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";

export const thirdwebClient = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "demo-client-id",
});

export const BASE_CHAIN = base;
