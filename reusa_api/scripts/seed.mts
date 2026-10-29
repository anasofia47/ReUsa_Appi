import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Falta ${key}. Completa .env a partir de .env.example`);
    process.exit(1);
  }
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();
const reset = process.argv.includes("--reset");

interface SeedItem {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  deliveryPoint: string;
  publisherId: string;
  publisherEmail: string;
  publisherName: string;
  status: "approved" | "pending_approval";
  available: boolean;
}

const items: SeedItem[] = [
  {
    id: "calculadora-casio-570",
    title: "Calculadora Científica Casio fx-570ES Plus",
    description: "Excelente estado, incluye tapa dura. Ideal para cálculo y física en ingeniería de software.",
    category: "Tecnología y Calculadoras",
    condition: "Como nuevo",
    deliveryPoint: "Bloque 1 - Cafetería TdeA",
    publisherId: "seed-user-1",
    publisherEmail: "donante1@tdea.edu.co",
    publisherName: "Camilo Torres",
    status: "approved",
    available: true,
  },
  {
    id: "libro-calculo-stewart",
    title: "Cálculo de Una Variable - James Stewart 7ma Ed",
    description: "Libro impreso en buen estado, sin tachaduras graves. Muy útil para el primer semestre.",
    category: "Libros y Guías",
    condition: "Buen estado",
    deliveryPoint: "Bloque 2 - Biblioteca TdeA",
    publisherId: "seed-user-2",
    publisherEmail: "donante2@tdea.edu.co",
    publisherName: "Valentina Ríos",
    status: "approved",
    available: true,
  },
  {
    id: "tabla-dibujo-arquitectura",
    title: "Tabla de Dibujo Portátil con Regla T",
    description: "Para estudiantes de diseño o dibujo técnico. Incluye escuadras de 45 y 60 grados.",
    category: "Papelería y Dibujo",
    condition: "Buen estado",
    deliveryPoint: "Bloque 4 - Sala de cómputo",
    publisherId: "seed-user-1",
    publisherEmail: "donante1@tdea.edu.co",
    publisherName: "Camilo Torres",
    status: "approved",
    available: true,
  },
  {
    id: "bata-laboratorio-blanca",
    title: "Bata Blanca de Laboratorio Talla M",
    description: "100% algodón, solo se usó 3 veces para química básica. Limpia y sin rotos.",
    category: "Ropa y Uniformes",
    condition: "Como nuevo",
    deliveryPoint: "Bloque 1 - Hall principal",
    publisherId: "seed-user-3",
    publisherEmail: "donante3@tdea.edu.co",
    publisherName: "Mariana Mesa",
    status: "approved",
    available: true,
  },
  {
    id: "hub-usb-c-hdmi",
    title: "Adaptador Hub USB-C Multipuerto (HDMI, USB 3.0, SD)",
    description: "Funciona perfecto para conectar portátiles a proyectores en las aulas de clase.",
    category: "Tecnología y Calculadoras",
    condition: "Excelente",
    deliveryPoint: "Bloque 2 - Auditorio",
    publisherId: "seed-user-2",
    publisherEmail: "donante2@tdea.edu.co",
    publisherName: "Valentina Ríos",
    status: "approved",
    available: true,
  },
  {
    id: "apuntes-estructuras-datos",
    title: "Carpeta con Guías y Talleres de Estructuras de Datos",
    description: "Recopilación de ejercicios resueltos en C++ y Java, algoritmos de grafos y árboles.",
    category: "Libros y Guías",
    condition: "Aceptable",
    deliveryPoint: "Bloque 1 - Cafetería",
    publisherId: "seed-user-3",
    publisherEmail: "donante3@tdea.edu.co",
    publisherName: "Mariana Mesa",
    status: "pending_approval", // Para probar la aprobación de supervisores
    available: true,
  },
];

async function seed() {
  for (const { id, ...item } of items) {
    const ref = db.collection("items").doc(id);
    const exists = (await ref.get()).exists;
    if (exists && !reset) {
      console.log(`= Objeto existente: ${item.title}`);
      continue;
    }
    const now = new Date().toISOString();
    await ref.set({
      ...item,
      coverVersion: 0,
      reviewedBy: item.status === "approved" ? "system-seed" : null,
      reviewedAt: item.status === "approved" ? now : null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`+ Objeto cargado: ${item.title} (${item.status})`);
  }
}

await seed();
console.log("\nListo. Los objetos semilla se han cargado en Firestore.");
console.log("Puedes crear usuarios con los tres roles disponibles:");
console.log('  pnpm create-user -- estudiante@tdea.edu.co "clave123" "Estudiante TdeA" student');
console.log('  pnpm create-user -- supervisor@tdea.edu.co "clave123" "Supervisor Campus" supervisor');
console.log('  pnpm create-user -- admin@tdea.edu.co "clave123" "Admin ReUsa" admin');
