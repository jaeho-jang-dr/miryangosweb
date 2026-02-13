// Re-export local firebase instance for shared code compatibility
import { app, auth, db, storage } from './firebase';

export { app, auth, db, storage };
export function getFirebaseInstance() {
  return { app, auth, db, storage };
}
