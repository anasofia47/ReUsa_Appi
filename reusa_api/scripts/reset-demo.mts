import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();

const requests = await db.collection("requests").get();
await Promise.all(requests.docs.map((d) => d.ref.delete()));

const covers = await db.collection("itemCovers").get();
await Promise.all(covers.docs.map((d) => d.ref.delete()));

const now = new Date().toISOString();
const items = await db.collection("items").get();
await Promise.all(
  items.docs.map((d) =>
    d.ref.update({ available: true, coverVersion: 0, updatedAt: now }),
  ),
);

console.log(
  `Restablecido: ${requests.size} solicitudes y ${covers.size} fotos eliminadas. ${items.size} objetos restaurados.`,
);
