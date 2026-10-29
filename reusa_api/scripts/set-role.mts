import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [email, role] = process.argv.slice(2).filter((a) => a !== "--");

if (!email || !["student", "supervisor", "admin"].includes(role ?? "")) {
  console.error("Uso: pnpm set-role -- <correo> <student|supervisor|admin>");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});

const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { role });
await getAuth().revokeRefreshTokens(user.uid);
await getFirestore().collection("users").doc(user.uid).set({ role }, { merge: true });
console.log(`✓ El usuario ${email} ahora tiene el rol: ${role}`);
