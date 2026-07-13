import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { UserProfile } from "../types";

export const UserRepository = {
  async getUser(id: string): Promise<UserProfile | null> {
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  },

  async createUser(user: UserProfile): Promise<void> {
    const docRef = doc(db, "users", user.id);
    // Don't overwrite if it already exists, so maybe use { merge: true }
    await setDoc(docRef, user, { merge: true });
  },

  async addConnection(userId: string, connectionId: string): Promise<void> {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, {
      connections: arrayUnion(connectionId)
    });
  },

  async addDeviceToken(userId: string, token: string): Promise<void> {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, {
      deviceTokens: arrayUnion(token)
    });
  }
};
