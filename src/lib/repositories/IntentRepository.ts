import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";
import { Intent } from "../types";

export const IntentRepository = {
  async getIntent(id: string): Promise<Intent | null> {
    const docRef = doc(db, "intents", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Intent;
    }
    return null;
  },

  async createIntent(intent: Intent): Promise<void> {
    const docRef = doc(db, "intents", intent.id);
    await setDoc(docRef, intent);
  },

  async getActiveIntentsForConnections(connectionIds: string[]): Promise<Intent[]> {
    if (connectionIds.length === 0) return [];
    
    // Note: 'in' queries are limited to 10 items in Firestore. For a larger alpha, 
    // we would need to batch queries or handle this logic differently.
    const chunks = [];
    for (let i = 0; i < connectionIds.length; i += 10) {
      chunks.push(connectionIds.slice(i, i + 10));
    }
    
    let allIntents: Intent[] = [];
    for (const chunk of chunks) {
      const q = query(
        collection(db, "intents"), 
        where("creatorId", "in", chunk),
        where("status", "==", "active")
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        allIntents.push({ id: doc.id, ...doc.data() } as Intent);
      });
    }
    return allIntents;
  }
};
