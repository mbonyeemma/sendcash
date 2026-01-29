import { Encryption } from "../libs/encryption";


export async function main() {
 

  const key='533883141fdf0e4993cbb4e22c40bc5b:b784f6a34bb510ec6f1ea1c3069014d227cc1c02403cd15d7d4fe189167142471ac000a6d3bec3a61094c51b6e462fc7d1d6d1a3fe4af53c66c6929e30cbd384c531'

   const decrypted = Encryption.decrypt(key);
   console.log(`Decrypted: ${decrypted}`);

  const FCM = require('../helpers/FCM');
  const token = "dR_ns5y8T5KbalboxIBFjd:APA91bEpsl4kZOsCVEDugb-vZ2AQdFxCuqnxq9aMqRRP8VgWzqEnFBmfcEJ4rznL0x1310PbldtrD1uKTxRPzMFDhqrRvvnOPF-JENqeqe4vSiY4kveWUW0";
  const data = {
    title: "KITI PAY",
    body: "The deployment is finished"
  }
  const result = await FCM.sendNotification(token, data);
  console.log(`Result: ${result}`);
}

// Auto-execute if this file is run directly
if (require.main === module) {
  main().catch(console.error);
}

export default { main };