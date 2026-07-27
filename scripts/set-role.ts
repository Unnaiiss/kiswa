import { adminAuth } from "@/lib/firebase/admin";
import { usersCollection } from "@/lib/firestore/admin-collections";

async function main() {
  const [, , email, password, name, role] = process.argv;

  if (!email || !password || !name || (role !== "admin" && role !== "staff")) {
    console.error(
      "Usage: npm run set-role -- <email> <password> <name> <admin|staff>",
    );
    process.exit(1);
  }

  let uid: string;
  const existing = await adminAuth.getUserByEmail(email).catch(() => null);

  if (existing) {
    await adminAuth.updateUser(existing.uid, { password, displayName: name });
    uid = existing.uid;
    console.log(`Updated existing Firebase Auth user ${email} (${uid})`);
  } else {
    const created = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    uid = created.uid;
    console.log(`Created Firebase Auth user ${email} (${uid})`);
  }

  await adminAuth.setCustomUserClaims(uid, { role });
  await usersCollection().doc(uid).set({ role, name });

  console.log(`Set role='${role}' custom claim and users/${uid} Firestore doc.`);
  console.log(`\nSign in at /login with:\n  email: ${email}\n  password: ${password}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
