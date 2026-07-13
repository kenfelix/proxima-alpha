import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { UserRepository } from "@/lib/repositories/UserRepository";

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  link: string;
  type: string;
  read: boolean;
  createdAt: any;
}

export class NotificationService {
  /**
   * Sends a notification to multiple users. Handles In-App, Push, and Optional Email Digest.
   */
  static async sendNotification(
    userIds: string[],
    title: string,
    body: string,
    link: string,
    type: 'intent' | 'vote' | 'chat' | 'payment' | 'system',
    sendEmailDigest: boolean = false,
    digestContext?: {
      title: string;
      time: number;
      venue: string;
    }
  ) {
    if (!userIds || userIds.length === 0) return;

    try {
      const tokens: string[] = [];
      const emails: string[] = [];

      for (const uid of userIds) {
        // 1. Create In-App Notification Document
        await addDoc(collection(db, "notifications"), {
          userId: uid,
          title,
          body,
          link,
          type,
          read: false,
          createdAt: serverTimestamp()
        });

        // 2. Gather device tokens and emails for external pushes
        const profile = await UserRepository.getUser(uid);
        if (profile) {
          if (profile.deviceTokens && Array.isArray(profile.deviceTokens)) {
            tokens.push(...profile.deviceTokens);
          }
          if (sendEmailDigest && profile.email) {
            emails.push(profile.email);
          }
        }
      }

      // 3. Trigger Web/Native Push
      if (tokens.length > 0) {
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens,
            title,
            body,
            link
          })
        }).catch(err => console.error("Push Error", err));
      }

      // 4. Trigger Email Digest (if requested)
      if (sendEmailDigest && emails.length > 0 && digestContext) {
        await fetch('/api/digest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails,
            title: digestContext.title,
            time: digestContext.time,
            venue: digestContext.venue,
            link
          })
        }).catch(err => console.error("Digest Error", err));
      }

    } catch (error) {
      console.error("Error in NotificationService", error);
    }
  }

  static async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true
      });
    } catch (e) {
      console.error(e);
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false));
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(d => updateDoc(d.ref, { read: true }));
      await Promise.all(updates);
    } catch (e) {
      console.error(e);
    }
  }
}
