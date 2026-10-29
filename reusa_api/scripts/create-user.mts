import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [email, password, displayName, role] = process.argv.slice(2).filter((a) => a !== "--");

if (!email || !password || !displayName || !["student", "supervisor", "admin"].includes(role ?? "")) {
  console.error('Uso: pnpm create-user -- <correo> <contraseña> "<nombre>" <student|supervisor|admin>');
  process.exit(1);
}

if (password.length < 6) {
  console.error("Firebase exige contraseñas de al menos 6 caracteres.");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});

const auth = getAuth();
let uid: string;

try {
  uid = (await auth.getUserByEmail(email)).uid;
  await auth.updateUser(uid, { password, displayName });
  console.log(`= Usuario existente actualizado: ${email}`);
} catch (err) {
  if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
  uid = (await auth.createUser({ email, password, displayName })).uid;
  console.log(`+ Usuario creado: ${email}`);
}

await auth.setCustomUserClaims(uid, { role });
await auth.revokeRefreshTokens(uid);
await getFirestore()
  .collection("users")
  .doc(uid)
  .set({ email, displayName, role, createdAt: new Date().toISOString() }, { merge: true });

console.log(`✓ Rol asignado con éxito: ${role}`);
