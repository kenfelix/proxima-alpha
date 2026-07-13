import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { Hangout } from "../types";

export const HangoutRepository = {
  async getHangout(id: string): Promise<Hangout | null> {
    const docRef = doc(db, "hangouts", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Hangout;
    }
    return null;
  },

  async createHangout(hangout: Hangout): Promise<void> {
    const docRef = doc(db, "hangouts", hangout.id);
    await setDoc(docRef, hangout);
  },

  async addAttendee(hangoutId: string, userId: string): Promise<void> {
    const docRef = doc(db, "hangouts", hangoutId);
    await updateDoc(docRef, {
      attendees: arrayUnion(userId)
    });
  },
  
  async markPresent(hangoutId: string, userId: string): Promise<void> {
    const docRef = doc(db, "hangouts", hangoutId);
    await updateDoc(docRef, {
      presentAttendees: arrayUnion(userId)
    });
  }
};
